/** Close the drawer, then run navigation on the next frame so Modal state updates first. */
export function navigateAfterDrawerClose(onClose: () => void, action: () => void): void {
  onClose();
  requestAnimationFrame(() => {
    requestAnimationFrame(action);
  });
}
