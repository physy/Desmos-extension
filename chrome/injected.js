window.desmosExtensionAPI = {
  getExpressionLatex: function (exprId) {
    try {
      if (window.Calc && typeof window.Calc.getExpressions === "function") {
        const expressions = window.Calc.getExpressions();
        const expr = expressions.find((e) => e.id === exprId);
        return expr ? expr.latex : null;
      }
      return null;
    } catch (error) {
      console.error("Expression取得エラー:", error);
      return null;
    }
  },
  setExpressionLatex: function (exprId, latex) {
    try {
      if (window.Calc && typeof window.Calc.setExpression === "function") {
        window.Calc.setExpression({ id: exprId, latex: latex });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Expression設定エラー:", error);
      return false;
    }
  },
};

// content scriptからのメッセージを受信
window.addEventListener("message", function (event) {
  if (event.source !== window) return;

  if (event.data.type === "DESMOS_GET_EXPRESSION") {
    const latex = window.desmosExtensionAPI.getExpressionLatex(event.data.exprId);
    window.postMessage(
      {
        type: "DESMOS_GET_EXPRESSION_RESPONSE",
        requestId: event.data.requestId,
        latex: latex,
      },
      "*"
    );
  }

  if (event.data.type === "DESMOS_SET_EXPRESSION") {
    const success = window.desmosExtensionAPI.setExpressionLatex(
      event.data.exprId,
      event.data.latex
    );
    window.postMessage(
      {
        type: "DESMOS_SET_EXPRESSION_RESPONSE",
        requestId: event.data.requestId,
        success: success,
      },
      "*"
    );
  }
});
