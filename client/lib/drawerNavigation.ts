/** Navigate immediately after closing a drawer modal (avoids fixed delay flicker). */
export function navigateAfterDrawerClose(onClose: () => void, action: () => void): void {
  onClose();
  requestAnimationFrame(action);
}
