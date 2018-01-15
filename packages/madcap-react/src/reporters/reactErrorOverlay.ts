import { MadcapError } from 'madcap.d';

interface IErrorOverlayProps {
  currentBuildError: any;
  currentRuntimeErrorRecords: any;
  dismissRuntimeErrors: any;
  editorHandler: any;
}

interface IOverlayFrame extends Window {
  updateContent(errorOverlayProps: IErrorOverlayProps): boolean;
}

function reactErrorOverlay(error: MadcapError) {
  const oldIframeReady = (window as any).__REACT_ERROR_OVERLAY_GLOBAL_HOOK__
    .iframeReady;
  (window as any).__REACT_ERROR_OVERLAY_GLOBAL_HOOK__.iframeReady = function() {
    const overlayFrame: HTMLIFrameElement = Array.from(
      document.querySelectorAll('iframe')
    ).slice(-1)[0];

    const overlayFrameWindow = overlayFrame.contentWindow as IOverlayFrame;
    const oldUpdateContent = overlayFrameWindow.updateContent;

    overlayFrameWindow.updateContent = function(errorOverlayProps) {
      oldUpdateContent(errorOverlayProps);
      const errorOverlayHTML = `
            <div class="error-overlay">
                <div class="error-message">${error.message}</div>
            </div>
        `;
      overlayFrameWindow.document.body.insertAdjacentHTML(
        'beforeend',
        errorOverlayHTML
      );
      return true;
    };

    oldIframeReady();
  };
}

export default reactErrorOverlay;
