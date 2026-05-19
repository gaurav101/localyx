interface CodeEditorViewProps {
  title: string;
  codeHTML: string;
}

export function CodeEditorView({ title, codeHTML }: CodeEditorViewProps) {
  return (
    <div className="code-editor">
      <div className="code-editor-header">
        <div className="code-editor-dots">
          <div className="code-editor-dot red" />
          <div className="code-editor-dot yellow" />
          <div className="code-editor-dot green" />
        </div>
        <div className="code-editor-title">{title}</div>
      </div>
      <pre className="code-editor-body" dangerouslySetInnerHTML={{ __html: codeHTML }} />
    </div>
  );
}
