import type { ModalApiOptions, ModalState } from './modal';

import { Store } from '@operon-core/shared/store';
import { bindMethods, isFunction } from '@operon-core/shared/utils';

export class ModalApi<TData = unknown> {
  // Shared data
  public sharedData: Record<'payload', TData | undefined> = {
    payload: undefined,
  };
  public store: Store<ModalState>;

  private api: Pick<
    ModalApiOptions,
    | 'onBeforeClose'
    | 'onCancel'
    | 'onClosed'
    | 'onConfirm'
    | 'onOpenChange'
    | 'onOpened'
  >;

  // private prevState!: ModalState;
  private state!: ModalState;

  constructor(options: ModalApiOptions = {}) {
    const {
      connectedComponent: _,
      onBeforeClose,
      onCancel,
      onClosed,
      onConfirm,
      onOpenChange,
      onOpened,
      ...storeState
    } = options;

    const defaultState: ModalState = {
      bordered: true,
      centered: false,
      class: '',
      closeOnClickModal: true,
      closeOnPressEscape: true,
      confirmDisabled: false,
      confirmLoading: false,
      contentClass: '',
      destroyOnClose: true,
      draggable: false,
      overflow: false,
      footer: true,
      footerClass: '',
      fullscreen: false,
      fullscreenButton: true,
      header: true,
      headerClass: '',
      isOpen: false,
      loading: false,
      modal: true,
      openAutoFocus: false,
      showCancelButton: true,
      showConfirmButton: true,
      title: '',
      animationType: 'slide',
    };

    this.store = new Store<ModalState>({
      ...defaultState,
      ...storeState,
    });

    this.store.subscribe((state) => {
      // onOpenChange callback is called every time state updates
      const prevIsOpen = this.state?.isOpen;
      this.state = state;
      if (state?.isOpen !== prevIsOpen) {
        this.api.onOpenChange?.(!!state?.isOpen);
      }
    });

    this.state = this.store.state;

    this.api = {
      onBeforeClose,
      onCancel,
      onClosed,
      onConfirm,
      onOpenChange,
      onOpened,
    };
    bindMethods(this);
  }

  /**
   * Close modal
   * @description Calls onBeforeClose hook when closing modal; if onBeforeClose returns false, closing is aborted
   */
  async close() {
    // Determine whether closing is permitted via onBeforeClose hook
    // If onBeforeClose returns false, do not close modal
    const allowClose = (await this.api.onBeforeClose?.()) ?? true;
    if (allowClose) {
      this.store.setState((prev) => ({
        ...prev,
        isOpen: false,
      }));
    }
  }

  getData(): TData | undefined {
    return this.sharedData.payload;
  }

  /**
   * Lock modal state (used for pending state during submission)
   * @description Locked state disables default cancel button, overlays content with spinner, hides close button, prevents manual closing, and marks submit button as loading
   * @param isLocked Whether locked
   */
  lock(isLocked = true) {
    return this.setState({ submitting: isLocked });
  }

  /**
   * Cancel operation
   */
  onCancel() {
    if (this.api.onCancel) {
      this.api.onCancel?.();
    } else {
      this.close();
    }
  }

  /**
   * Callback when modal close animation completes
   */
  onClosed() {
    if (!this.state.isOpen) {
      this.api.onClosed?.();
    }
  }

  /**
   * Confirm operation
   */
  onConfirm() {
    this.api.onConfirm?.();
  }

  /**
   * Callback when modal open animation completes
   */
  onOpened() {
    if (this.state.isOpen) {
      this.api.onOpened?.();
    }
  }

  open() {
    this.store.setState((prev) => ({
      ...prev,
      isOpen: true,
      submitting: false,
    }));
  }

  setData(payload: TData) {
    this.sharedData.payload = payload;
    return this;
  }

  setState(
    stateOrFn:
      | ((prev: ModalState) => Partial<ModalState>)
      | Partial<ModalState>,
  ) {
    if (isFunction(stateOrFn)) {
      this.store.setState(stateOrFn);
    } else {
      this.store.setState((prev) => ({ ...prev, ...stateOrFn }));
    }
    return this;
  }

  /**
   * Unlock modal state
   * @description Unlocks the locked state set by lock method, alias for lock(false)
   */
  unlock() {
    return this.lock(false);
  }
}
