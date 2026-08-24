import asyncio
import json
from types import SimpleNamespace

from llmfit_dashboard import server
from llmfit_dashboard.server import MIN_LLMFIT_VERSION, is_supported_version, parse_version


def test_parse_llmfit_version_output():
    assert parse_version("llmfit 1.1.10") == (1, 1, 10)
    assert parse_version("version: 2.0") == (2, 0)
    assert parse_version("not a version") is None


def test_supported_version_boundary():
    assert is_supported_version(MIN_LLMFIT_VERSION)
    assert is_supported_version((1, 2, 0))
    assert not is_supported_version((1, 1, 9))
    assert not is_supported_version(None)


def test_manager_reports_missing_cli(monkeypatch):
    monkeypatch.setattr(server.shutil, "which", lambda _: None)
    manager = server.RuntimeManager()

    asyncio.run(manager.start())

    assert manager.status == "error"
    assert manager.cli_path is None
    assert "uv tool install" in manager.message


def test_manager_rejects_old_cli(monkeypatch):
    monkeypatch.setattr(server.shutil, "which", lambda _: "llmfit")

    async def fake_to_thread(*_args, **_kwargs):
        return SimpleNamespace(stdout="llmfit 1.1.9", stderr="", returncode=0)

    monkeypatch.setattr(server.asyncio, "to_thread", fake_to_thread)
    manager = server.RuntimeManager()

    asyncio.run(manager.start())

    assert manager.status == "error"
    assert "版本过旧" in manager.message


def make_request(query: str = ""):
    from starlette.requests import Request

    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/v1/models",
            "query_string": query.encode(),
            "headers": [],
        }
    )


def test_proxy_forwards_whitelisted_queries(monkeypatch):
    seen = {}

    async def fake_request(path, params):
        seen.update(path=path, params=params)
        return 200, {"models": []}, {"content-type": "application/json"}

    monkeypatch.setattr(server.manager, "request", fake_request)
    response = asyncio.run(server.proxy(make_request("search=qwen&unknown=drop"), "/api/v1/models"))

    assert response.status_code == 200
    assert seen == {"path": "/api/v1/models", "params": {"search": "qwen"}}
    assert json.loads(response.body) == {"models": []}


def test_proxy_maps_upstream_timeout(monkeypatch):
    async def fake_request(*_args, **_kwargs):
        raise server.UpstreamTimeout("slow")

    monkeypatch.setattr(server.manager, "request", fake_request)
    response = asyncio.run(server.proxy(make_request(), "/api/v1/system"))

    assert response.status_code == 504
    assert json.loads(response.body) == {"error": "slow"}
