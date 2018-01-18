"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function reactErrorOverlay(error) {
    const oldIframeReady = window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__
        .iframeReady;
    window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__.iframeReady = function () {
        const overlayFrame = Array.from(document.querySelectorAll('iframe')).slice(-1)[0];
        const overlayFrameWindow = overlayFrame.contentWindow;
        const oldUpdateContent = overlayFrameWindow.updateContent;
        overlayFrameWindow.updateContent = function (errorOverlayProps) {
            oldUpdateContent(errorOverlayProps);
            const errorOverlayHTML = `
            <div class="error-overlay">
                <div class="error-message">${error.message}</div>
            </div>
        `;
            overlayFrameWindow.document.body.insertAdjacentHTML('beforeend', errorOverlayHTML);
            return true;
        };
        oldIframeReady();
    };
}
exports.reactErrorOverlay = reactErrorOverlay;
//# sourceMappingURL=reactErrorOverlay.js.map