"""Local web server that supervises the official ``llmfit serve`` process."""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import os
import re
import shutil
import socket
import subprocess
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import httpx
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

MIN_LLMFIT_VERSION = (1, 1, 10)
STARTUP_TIMEOUT_SECONDS = 15.0
UPSTREAM_TIMEOUT_SECONDS = 20.0
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
VERSION_PATTERN = re.compile(r"(?:llmfit\s+)?(\d+(?:\.\d+){1,3})", re.IGNORECASE)
ALLOWED_QUERY_KEYS = {
    "search",
    "provider",
    "min_fit",
    "runtime",
    "use_case",
    "sort",
    "limit",
    "n",
    "include_too_tight",
    "max_context",
}


def parse_version(value: str) -> tuple[int, ...] | None:
    """Extract a numeric version tuple from ``llmfit --version`` output."""

    match = VERSION_PATTERN.search(value)
    if not match:
        return None
    return tuple(int(part) for part in match.group(1).split("."))


def is_supported_version(version: tuple[int, ...] | None) -> bool:
    """Return whether a detected CLI version can serve the v1 API we use."""

    if version is None:
        return False
    padded = version + (0,) * (len(MIN_LLMFIT_VERSION) - len(version))
    return padded[: len(MIN_LLMFIT_VERSION)] >= MIN_LLMFIT_VERSION


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((DEFAULT_HOST, 0))
        return int(sock.getsockname()[1])


class RuntimeManager:
    """Own the upstream process and expose a small, testable status surface."""

    def __init__(self) -> None:
        self.cli_path: str | None = None
        self.cli_version: str | None = None
        self.process: subprocess.Popen[str] | None = None
        self.upstream_port: int | None = None
        self.status: str = "starting"
        self.upstream_ready = False
        self.message: str | None = None

    @property
    def base_url(self) -> str | None:
        if self.upstream_port is None:
            return None
        return f"http://{DEFAULT_HOST}:{self.upstream_port}"

    def status_payload(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "cli_found": self.cli_path is not None,
            "cli_version": self.cli_version,
            "upstream_ready": self.upstream_ready,
            **({"message": self.message} if self.message else {}),
        }

    async def start(self) -> None:
        self.status = "starting"
        self.message = None
        self.cli_path = shutil.which("llmfit")
        if not self.cli_path:
            self._fail("未找到官方 llmfit 命令。请先执行：uv tool install -U llmfit")
            return

        try:
            completed = await asyncio.to_thread(
                subprocess.run,
                [self.cli_path, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
                shell=False,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            self._fail(f"读取 llmfit 版本失败：{exc}")
            return

        version_output = (completed.stdout or completed.stderr).strip()
        version = parse_version(version_output)
        self.cli_version = version_output or None
        if completed.returncode != 0 or not is_supported_version(version):
            self._fail(
                "官方 llmfit 版本过旧或无法识别。请执行：uv tool install -U llmfit"
            )
            return

        self.upstream_port = find_free_port()
        try:
            self.process = subprocess.Popen(
                [
                    self.cli_path,
                    "serve",
                    "--host",
                    DEFAULT_HOST,
                    "--port",
                    str(self.upstream_port),
                ],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                shell=False,
                text=True,
            )
        except OSError as exc:
            self._fail(f"启动 llmfit 服务失败：{exc}")
            return

        deadline = asyncio.get_running_loop().time() + STARTUP_TIMEOUT_SECONDS
        while asyncio.get_running_loop().time() < deadline:
            if self.process.poll() is not None:
                self._fail("llmfit 服务启动后立即退出，请检查官方 CLI 安装。")
                return
            try:
                async with httpx.AsyncClient(timeout=1.5) as client:
                    response = await client.get(f"{self.base_url}/health")
                if response.is_success:
                    self.status = "ready"
                    self.upstream_ready = True
                    return
            except (httpx.HTTPError, OSError):
                pass
            await asyncio.sleep(0.25)

        self._fail("等待 llmfit 服务就绪超时（15 秒）。")
        await self.stop()

    def _fail(self, message: str) -> None:
        self.status = "error"
        self.upstream_ready = False
        self.message = message

    async def stop(self) -> None:
        process = self.process
        self.process = None
        if process is None or process.poll() is not None:
            return
        process.terminate()
        try:
            await asyncio.to_thread(process.wait, 3)
        except subprocess.TimeoutExpired:
            process.kill()
            await asyncio.to_thread(process.wait, 3)

    async def request(
        self, path: str, params: dict[str, str]
    ) -> tuple[int, Any, dict[str, str]]:
        if not self.upstream_ready or not self.base_url:
            raise UpstreamUnavailable(self.message or "llmfit 服务尚未就绪。")
        if self.process and self.process.poll() is not None:
            self._fail("llmfit 服务已退出，请重新启动看板。")
            raise UpstreamUnavailable(self.message)

        try:
            async with httpx.AsyncClient(timeout=UPSTREAM_TIMEOUT_SECONDS) as client:
                upstream = await client.get(f"{self.base_url}{path}", params=params)
        except httpx.TimeoutException as exc:
            raise UpstreamTimeout("llmfit 服务响应超时。") from exc
        except httpx.HTTPError as exc:
            raise UpstreamUnavailable(f"无法连接 llmfit 服务：{exc}") from exc

        try:
            payload: Any = upstream.json()
        except ValueError:
            payload = {"error": upstream.text or "上游返回了无效响应。"}
        return upstream.status_code, payload, {"content-type": "application/json"}


class UpstreamUnavailable(RuntimeError):
    pass


class UpstreamTimeout(RuntimeError):
    pass


manager = RuntimeManager()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await manager.start()
    try:
        yield
    finally:
        await manager.stop()


app = FastAPI(title="LLMFit 本地硬件适配看板", lifespan=lifespan)


def query_params(request: Request) -> dict[str, str]:
    return {
        key: value
        for key, value in request.query_params.items()
        if key in ALLOWED_QUERY_KEYS and value != ""
    }


async def proxy(request: Request, path: str) -> Response:
    try:
        code, payload, headers = await manager.request(path, query_params(request))
    except UpstreamUnavailable as exc:
        return JSONResponse({"error": str(exc)}, status_code=503)
    except UpstreamTimeout as exc:
        return JSONResponse({"error": str(exc)}, status_code=504)
    return JSONResponse(payload, status_code=code, headers=headers)


@app.get("/api/app/status")
async def app_status() -> dict[str, Any]:
    return manager.status_payload()


@app.get("/health")
async def health() -> Response:
    if manager.status != "ready":
        return JSONResponse(manager.status_payload(), status_code=503)
    return JSONResponse({"status": "ok", "upstream": "ok"})


@app.get("/api/v1/system")
async def system(request: Request) -> Response:
    return await proxy(request, "/api/v1/system")


@app.get("/api/v1/models")
async def models(request: Request) -> Response:
    return await proxy(request, "/api/v1/models")


@app.get("/api/v1/models/top")
async def top_models(request: Request) -> Response:
    return await proxy(request, "/api/v1/models/top")


FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:

    @app.get("/", response_class=HTMLResponse)
    async def frontend_not_built() -> str:
        return """<!doctype html><meta charset='utf-8'><title>LLMFit 看板</title>
        <style>body{font:16px system-ui;max-width:720px;margin:12vh auto;padding:24px;background:#0b1020;color:#e8edf8}code{color:#7dd3fc}</style>
        <h1>LLMFit 看板前端尚未构建</h1><p>请在项目目录执行 <code>npm ci && npm run build</code>，然后重新运行启动脚本。</p>"""


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="启动 LLMFit 本地 Web 看板")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", default=DEFAULT_PORT, type=int)
    parser.add_argument("--no-open", action="store_true", help="不自动打开浏览器")
    args = parser.parse_args(argv)

    if not args.no_open:
        import threading
        import webbrowser

        threading.Timer(1.0, lambda: webbrowser.open(f"http://{args.host}:{args.port}")).start()

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
