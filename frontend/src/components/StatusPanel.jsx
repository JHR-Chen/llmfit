export default function StatusPanel({ title, message, actionLabel = '重新加载', onAction }) {
  return (
    <section className="status-panel" role="alert">
      <div className="status-icon">!</div>
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
        {onAction && <button className="button button-primary" onClick={onAction}>{actionLabel}</button>}
      </div>
    </section>
  );
}
