<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

// Component props
const props = defineProps<{
  /** Aspect ratio, e.g. '1:1', '16:9', '3:4' (optional) */
  aspectRatio?: string;
  /** Container height (default: 400) */
  height?: number;
  /** Image URL */
  img: string;
  /** Container width (default: 500) */
  width?: number;
}>();

const CROPPER_CONSTANTS = {
  MIN_WIDTH: 60 as const,
  MIN_HEIGHT: 60 as const,
  DEFAULT_WIDTH: 500 as const,
  DEFAULT_HEIGHT: 400 as const,
  PADDING_RATIO: 0.1 as const,
  MAX_PADDING: 50 as const,
} as const;

type Point = [number, number]; // [clientX, clientY]
type Dimension = [number, number, number, number]; // [top, right, bottom, left]

// Drag handle types
type DragAction =
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'
  | 'move'
  | 'right'
  | 'top'
  | 'top-left'
  | 'top-right';

// DOM refs
const containerRef = ref<HTMLDivElement | null>(null);
const bgImageRef = ref<HTMLImageElement | null>(null);
// const maskRef = ref<HTMLDivElement | null>(null);
const maskViewRef = ref<HTMLDivElement | null>(null);
const cropperRef = ref<HTMLDivElement | null>(null);
// const cropperViewRef = ref<HTMLDivElement | null>(null);

// Reactive state
const isCropperVisible = ref<boolean>(false);
const validAspectRatio = ref<null | number>(null); // Aspect ratio value (null = free ratio)
const containerWidth = ref<number>(
  props.width ?? CROPPER_CONSTANTS.DEFAULT_WIDTH,
);
const containerHeight = ref<number>(
  props.height ?? CROPPER_CONSTANTS.DEFAULT_HEIGHT,
);

// Crop box dimensions (top, right, bottom, left)
const currentDimension = ref<Dimension>([50, 50, 50, 50]);
const initDimension = ref<Dimension>([50, 50, 50, 50]);

// Drag state
const dragging = ref<boolean>(false);
const startPoint = ref<Point>([0, 0]);
const startDimension = ref<Dimension>([0, 0, 0, 0]);
const direction = ref<Dimension>([0, 0, 0, 0]);
const moving = ref<boolean>(false);

/**
 * Compute fitted image size to fit container within max dimensions
 */
const calculateImageFitSize = () => {
  if (!bgImageRef.value) return;

  // Get natural image dimensions
  const imgWidth = bgImageRef.value.naturalWidth;
  const imgHeight = bgImageRef.value.naturalHeight;

  if (imgWidth === 0 || imgHeight === 0) return;

  // Compute scale ratio using container dimensions
  const widthRatio =
    (props.width ?? CROPPER_CONSTANTS.DEFAULT_WIDTH) / imgWidth;
  const heightRatio =
    (props.height ?? CROPPER_CONSTANTS.DEFAULT_HEIGHT) / imgHeight;
  const scaleRatio = Math.min(widthRatio, heightRatio, 1); // Scale down only, do not upscale

  // Compute fitted container size
  const fitWidth = Math.floor(imgWidth * scaleRatio);
  const fitHeight = Math.floor(imgHeight * scaleRatio);

  containerWidth.value = fitWidth;
  containerHeight.value = fitHeight;

  // Reset crop box initial dimensions
  const padding = Math.min(
    CROPPER_CONSTANTS.MAX_PADDING,
    Math.floor(fitWidth * CROPPER_CONSTANTS.PADDING_RATIO),
    Math.floor(fitHeight * CROPPER_CONSTANTS.PADDING_RATIO),
  );

  initDimension.value = [padding, padding, padding, padding];
  currentDimension.value = [padding, padding, padding, padding];
};

/**
 * Validate and parse aspect ratio string
 * @returns {number|null} Ratio value (width/height), or null if invalid
 */
const parseAndValidateAspectRatio = (): null | number => {
  // Return null if no ratio provided
  if (!props.aspectRatio) {
    return null;
  }

  // Validate ratio format
  const ratioRegex = /^[1-9]\d*:[1-9]\d*$/;
  if (!ratioRegex.test(props.aspectRatio)) {
    console.warn('Invalid aspect ratio format; expected "W:H", e.g. "16:9"');
    return null;
  }

  // Parse ratio
  const [width, height] = props.aspectRatio.split(':').map(Number);

  // Validate parsed result
  if (Number.isNaN(width) || Number.isNaN(height) || !width || !height) {
    console.warn(
      'Aspect ratio parsing failed: width and height must be positive numbers',
    );
    return null;
  }

  return width / height;
};

/**
 * Set crop area dimensions
 * @param {Dimension} dimension - [top, right, bottom, left]
 */
const setDimension = (dimension: Dimension) => {
  currentDimension.value = [...dimension];
  if (maskViewRef.value) {
    maskViewRef.value.style.clipPath = `inset(${dimension[0]}px ${dimension[1]}px ${dimension[2]}px ${dimension[3]}px)`;
  }
};

/**
 * Adjust crop area to specified aspect ratio
 */
const adjustCropperToAspectRatio = () => {
  if (!cropperRef.value) return;

  // Validate and parse ratio
  validAspectRatio.value = parseAndValidateAspectRatio();

  // If free ratio, use initial dimensions without enforcing fixed ratio
  if (validAspectRatio.value === null) {
    setDimension(initDimension.value);
    return;
  }

  // Fixed ratio: adjust crop box to ratio
  const ratio = validAspectRatio.value;
  const containerWidthVal = containerWidth.value;
  const containerHeightVal = containerHeight.value;

  // Compute crop box size by ratio
  let newHeight: number, newWidth: number;

  // Compute width-first
  newWidth = containerWidthVal;
  newHeight = newWidth / ratio;

  // If height exceeds container, compute height-first
  if (newHeight > containerHeightVal) {
    newHeight = containerHeightVal;
    newWidth = newHeight * ratio;
  }

  // Center crop box
  const leftRight = (containerWidthVal - newWidth) / 2;
  const topBottom = (containerHeightVal - newHeight) / 2;

  const newDimension: Dimension = [topBottom, leftRight, topBottom, leftRight];

  setDimension(newDimension);
};

/**
 * Create cropper
 */
const createCropper = () => {
  // Compute image fit dimensions
  calculateImageFitSize();

  isCropperVisible.value = true;
  adjustCropperToAspectRatio();
};

/**
 * Handle mousedown event
 * @param {MouseEvent} e - Mouse event
 * @param {DragAction} action - Drag action
 */
const handleMouseDown = (e: MouseEvent, action: DragAction) => {
  dragging.value = true;
  startPoint.value = [e.clientX, e.clientY];
  startDimension.value = [...currentDimension.value];
  direction.value = [0, 0, 0, 0];
  moving.value = false;

  // Handle move
  if (action === 'move') {
    direction.value[0] = 1;
    direction.value[2] = -1;
    direction.value[3] = 1;
    direction.value[1] = -1;
    moving.value = true;
    return;
  }

  // Handle drag direction
  switch (action) {
    case 'bottom': {
      direction.value[2] = -1;
      break;
    }
    case 'bottom-left': {
      direction.value[2] = -1;
      direction.value[3] = 1;
      break;
    }
    case 'bottom-right': {
      direction.value[2] = -1;
      direction.value[1] = -1;
      break;
    }
    case 'left': {
      direction.value[3] = 1;
      break;
    }
    case 'right': {
      direction.value[1] = -1;
      break;
    }
    case 'top': {
      direction.value[0] = 1;
      break;
    }
    case 'top-left': {
      direction.value[0] = 1;
      direction.value[3] = 1;
      break;
    }
    case 'top-right': {
      direction.value[0] = 1;
      direction.value[1] = -1;
      break;
    }
  }
};

/**
 * Handle mousemove event
 * @param {MouseEvent} e - Mouse event
 */
const handleMouseMove = (e: MouseEvent) => {
  if (!dragging.value || !cropperRef.value) return;

  const { clientX, clientY } = e;
  const diffX = clientX - startPoint.value[0];
  const diffY = clientY - startPoint.value[1];

  // Handle moving crop box
  if (moving.value) {
    handleMoveCropBox(diffX, diffY);
    return;
  }

  // Free ratio
  if (validAspectRatio.value === null) {
    handleFreeAspectResize(diffX, diffY);
  } else {
    handleFixedAspectResize(diffX, diffY);
  }
};

const handleMoveCropBox = (diffX: number, diffY: number) => {
  const newDimension = [...startDimension.value] as Dimension;

  // Compute position after offset
  const tempTop = startDimension.value[0] + diffY;
  const tempLeft = startDimension.value[3] + diffX;

  // Compute fixed crop box size
  const cropWidth =
    containerWidth.value - startDimension.value[3] - startDimension.value[1];
  const cropHeight =
    containerHeight.value - startDimension.value[0] - startDimension.value[2];

  // Boundary constraints: keep crop box inside container with constant size
  // Top boundary constraint
  newDimension[0] = Math.max(
    0,
    Math.min(tempTop, containerHeight.value - cropHeight),
  );
  // Bottom boundary constraint
  newDimension[2] = containerHeight.value - newDimension[0] - cropHeight;
  // Left boundary constraint
  newDimension[3] = Math.max(
    0,
    Math.min(tempLeft, containerWidth.value - cropWidth),
  );
  // Right boundary constraint
  newDimension[1] = containerWidth.value - newDimension[3] - cropWidth;

  // Enforce constant dimension fallback
  const finalWidth = containerWidth.value - newDimension[3] - newDimension[1];
  const finalHeight = containerHeight.value - newDimension[0] - newDimension[2];

  if (finalWidth !== cropWidth) {
    newDimension[1] = containerWidth.value - newDimension[3] - cropWidth;
  }

  if (finalHeight !== cropHeight) {
    newDimension[2] = containerHeight.value - newDimension[0] - cropHeight;
  }

  // Update crop area position
  setDimension(newDimension);
};

const handleFreeAspectResize = (diffX: number, diffY: number) => {
  const cropperWidth = containerWidth.value;
  const cropperHeight = containerHeight.value;
  const currentDimensionNew: Dimension = [0, 0, 0, 0];

  // Compute new dimensions, enforcing minimum size
  currentDimensionNew[0] = Math.min(
    Math.max(startDimension.value[0] + direction.value[0] * diffY, 0),
    cropperHeight - CROPPER_CONSTANTS.MIN_HEIGHT,
  );

  currentDimensionNew[1] = Math.min(
    Math.max(startDimension.value[1] + direction.value[1] * diffX, 0),
    cropperWidth - CROPPER_CONSTANTS.MIN_WIDTH,
  );

  currentDimensionNew[2] = Math.min(
    Math.max(startDimension.value[2] + direction.value[2] * diffY, 0),
    cropperHeight - CROPPER_CONSTANTS.MIN_HEIGHT,
  );

  currentDimensionNew[3] = Math.min(
    Math.max(startDimension.value[3] + direction.value[3] * diffX, 0),
    cropperWidth - CROPPER_CONSTANTS.MIN_WIDTH,
  );

  // Ensure width and height meet minimum threshold
  const newWidth =
    cropperWidth - currentDimensionNew[3] - currentDimensionNew[1];
  const newHeight =
    cropperHeight - currentDimensionNew[0] - currentDimensionNew[2];

  if (newWidth < CROPPER_CONSTANTS.MIN_WIDTH) {
    if (direction.value[3] === 1) {
      currentDimensionNew[3] =
        cropperWidth - currentDimensionNew[1] - CROPPER_CONSTANTS.MIN_WIDTH;
    } else {
      currentDimensionNew[1] =
        cropperWidth - currentDimensionNew[3] - CROPPER_CONSTANTS.MIN_WIDTH;
    }
  }

  if (newHeight < CROPPER_CONSTANTS.MIN_HEIGHT) {
    if (direction.value[0] === 1) {
      currentDimensionNew[0] =
        cropperHeight - currentDimensionNew[2] - CROPPER_CONSTANTS.MIN_HEIGHT;
    } else {
      currentDimensionNew[2] =
        cropperHeight - currentDimensionNew[0] - CROPPER_CONSTANTS.MIN_HEIGHT;
    }
  }

  setDimension(currentDimensionNew);
};

const handleFixedAspectResize = (diffX: number, diffY: number) => {
  if (validAspectRatio.value === null) return;
  const cropperWidth = containerWidth.value;
  const cropperHeight = containerHeight.value;
  // Fixed ratio crop
  const ratio = validAspectRatio.value;
  const currentWidth =
    cropperWidth - startDimension.value[3] - startDimension.value[1];
  const currentHeight =
    cropperHeight - startDimension.value[0] - startDimension.value[2];

  let newHeight: number, newWidth: number;
  let widthChange = 0;
  let heightChange = 0;

  // Compute delta width/height
  if (direction.value[3] === 1) widthChange = -diffX;
  else if (direction.value[1] === -1) widthChange = diffX;

  if (direction.value[0] === 1) heightChange = -diffY;
  else if (direction.value[2] === -1) heightChange = diffY;

  const isCornerDrag =
    (direction.value[3] === 1 || direction.value[1] === -1) &&
    (direction.value[0] === 1 || direction.value[2] === -1);

  // Compute new dimensions
  if (isCornerDrag) {
    if (Math.abs(widthChange) > Math.abs(heightChange)) {
      newWidth = Math.max(
        CROPPER_CONSTANTS.MIN_WIDTH,
        currentWidth + widthChange,
      );
      newHeight = newWidth / ratio;
    } else {
      newHeight = Math.max(
        CROPPER_CONSTANTS.MIN_HEIGHT,
        currentHeight + heightChange,
      );
      newWidth = newHeight * ratio;
    }
  } else {
    if (direction.value[3] === 1 || direction.value[1] === -1) {
      newWidth = Math.max(
        CROPPER_CONSTANTS.MIN_WIDTH,
        currentWidth + widthChange,
      );
      newHeight = newWidth / ratio;
    } else {
      newHeight = Math.max(
        CROPPER_CONSTANTS.MIN_HEIGHT,
        currentHeight + heightChange,
      );
      newWidth = newHeight * ratio;
    }
  }

  // Restrict max dimensions
  const maxWidth = cropperWidth;
  const maxHeight = cropperHeight;

  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = newWidth / ratio;
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * ratio;
  }

  // Compute new position
  let newLeft = startDimension.value[3];
  let newTop = startDimension.value[0];
  let newRight = startDimension.value[1];
  let newBottom = startDimension.value[2];

  // Adjust position based on drag direction
  if (direction.value[3] === 1) {
    newLeft = cropperWidth - newWidth - startDimension.value[1];
  } else if (direction.value[1] === -1) {
    newRight = cropperWidth - newWidth - startDimension.value[3];
  } else if (!isCornerDrag) {
    // Center adjustment
    const currentHorizontalCenter = startDimension.value[3] + currentWidth / 2;
    newLeft = Math.max(
      0,
      Math.min(cropperWidth - newWidth, currentHorizontalCenter - newWidth / 2),
    );
    newRight = cropperWidth - newWidth - newLeft;
  }

  if (direction.value[0] === 1) {
    newTop = cropperHeight - newHeight - startDimension.value[2];
  } else if (direction.value[2] === -1) {
    newBottom = cropperHeight - newHeight - startDimension.value[0];
  } else if (!isCornerDrag) {
    // Center adjustment
    const currentVerticalCenter = startDimension.value[0] + currentHeight / 2;
    newTop = Math.max(
      0,
      Math.min(
        cropperHeight - newHeight,
        currentVerticalCenter - newHeight / 2,
      ),
    );
    newBottom = cropperHeight - newHeight - newTop;
  }

  // Boundary check
  newLeft = Math.max(0, newLeft);
  newTop = Math.max(0, newTop);
  newRight = Math.max(0, newRight);
  newBottom = Math.max(0, newBottom);

  const newDimension: Dimension = [newTop, newRight, newBottom, newLeft];
  setDimension(newDimension);
};

/**
 * Handle mouseup event
 */
const handleMouseUp = () => {
  dragging.value = false;
  moving.value = false;
  direction.value = [0, 0, 0, 0];
};

/**
 * Handle image load complete
 */
const handleImageLoad = () => {
  createCropper();
};

/**
 * Crop image
 * @param {'image/jpeg' | 'image/png'} format - Output image format
 * @param {number} quality - Compression quality (0-1)
 * @param {'blob' | 'base64'} outputType - Output format
 * @param {number} targetWidth - Target width (optional)
 * @param {number} targetHeight - Target height (optional)
 */
const getCropImage = async (
  format: 'image/jpeg' | 'image/png' = 'image/png',
  quality: number = 0.92,
  outputType: 'base64' | 'blob' = 'blob',
  targetWidth?: number,
  targetHeight?: number,
): Promise<Blob | string | undefined> => {
  if (!props.img || !bgImageRef.value || !containerRef.value) return;

  // Clamp quality between 0 and 1
  const validQuality = Math.max(0, Math.min(1, quality));

  // Create temporary image to fetch natural dimensions
  const tempImg = new Image();
  // Handle CORS: set anonymous cross-origin for external images
  if (props.img.startsWith('http://') || props.img.startsWith('https://')) {
    try {
      const url = new URL(props.img);
      if (url.origin !== location.origin) {
        tempImg.crossOrigin = 'anonymous';
      }
    } catch {
      // Invalid URL, skip CORS config without interrupting
    }
  }

  // Await image load
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      tempImg.removeEventListener('load', handleLoad);
      tempImg.removeEventListener('error', handleError);
      reject(new Error('Image load timeout (10s)'));
    }, 10_000);
    const handleLoad = () => {
      clearTimeout(timeout);
      tempImg.removeEventListener('load', handleLoad);
      tempImg.removeEventListener('error', handleError);
      resolve();
    };

    const handleError = (err: ErrorEvent) => {
      clearTimeout(timeout);
      tempImg.removeEventListener('load', handleLoad);
      tempImg.removeEventListener('error', handleError);
      reject(new Error(`Image load failed: ${err.message}`));
    };

    tempImg.addEventListener('load', handleLoad);
    tempImg.addEventListener('error', handleError);
    tempImg.src = props.img;
  });

  const containerRect = containerRef.value.getBoundingClientRect();
  const imgRect = bgImageRef.value.getBoundingClientRect();

  // 1. Compute render dimensions in container
  const containerWidth = containerRect.width;
  const containerHeight = containerRect.height;
  const renderedImgWidth = imgRect.width;
  const renderedImgHeight = imgRect.height;
  const imgOffsetX = (containerWidth - renderedImgWidth) / 2;
  const imgOffsetY = (containerHeight - renderedImgHeight) / 2;

  // 2. Compute crop box actual coordinates
  const [cropTop, cropRight, cropBottom, cropLeft] = currentDimension.value;
  const cropBoxWidth = containerWidth - cropLeft - cropRight;
  const cropBoxHeight = containerHeight - cropTop - cropBottom;

  // 3. Map crop box coordinates to image pixels
  const cropOnImgX = cropLeft - imgOffsetX;
  const cropOnImgY = cropTop - imgOffsetY;

  // 4. Compute scaling ratio to natural image pixels
  const scaleX = tempImg.width / renderedImgWidth;
  const scaleY = tempImg.height / renderedImgHeight;

  // 5. Map crop area to natural image pixels
  const originalCropX = Math.max(0, Math.floor(cropOnImgX * scaleX));
  const originalCropY = Math.max(0, Math.floor(cropOnImgY * scaleY));
  const originalCropWidth = Math.min(
    Math.floor(cropBoxWidth * scaleX),
    tempImg.width - originalCropX,
  );
  const originalCropHeight = Math.min(
    Math.floor(cropBoxHeight * scaleY),
    tempImg.height - originalCropY,
  );

  // Boundary validation
  if (originalCropWidth <= 0 || originalCropHeight <= 0) return;

  // 6. Handle HiDPI / Retina DPR scaling
  const dpr = window.devicePixelRatio || 1;

  // Final canvas size
  const finalWidth = targetWidth ? Math.max(1, targetWidth) : originalCropWidth;
  const finalHeight = targetHeight
    ? Math.max(1, targetHeight)
    : originalCropHeight;

  // Create canvas and 2D context
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Physical canvas dimensions
  canvas.width = finalWidth * dpr;
  canvas.height = finalHeight * dpr;

  // Visual canvas dimensions
  canvas.style.width = `${finalWidth}px`;
  canvas.style.height = `${finalHeight}px`;

  // Scale context for DPR
  ctx.scale(dpr, dpr);

  // 7. Draw cropped image with natural pixels
  ctx.drawImage(
    tempImg,
    originalCropX, // Crop source X
    originalCropY, // Crop source Y
    originalCropWidth, // Crop source width
    originalCropHeight, // Crop source height
    0, // Destination X
    0, // Destination Y
    finalWidth, // Destination width
    finalHeight, // Destination height
  );

  try {
    return outputType === 'base64'
      ? canvas.toDataURL(format, validQuality)
      : new Promise<Blob>((resolve) => {
          canvas.toBlob(
            (blob) => {
              // Fallback: empty Blob if generation fails
              resolve(blob || new Blob([], { type: format }));
            },
            format,
            validQuality,
          );
        });
  } catch (error) {
    console.error('Image export failed:', error);
  }
};

// Watch ratio changes and adjust crop box
watch(() => props.aspectRatio, adjustCropperToAspectRatio);

// Watch width/height changes and recalculate
watch([() => props.width, () => props.height], () => {
  calculateImageFitSize();
  adjustCropperToAspectRatio();
});

// Register global event listeners on mount
onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  // If image loaded, initialize cropper
  if (
    bgImageRef.value &&
    bgImageRef.value.complete &&
    bgImageRef.value.naturalWidth > 0
  ) {
    createCropper();
  }
});

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});

defineExpose({ getCropImage });
</script>

<template>
  <div
    :style="{
      width: `${width || CROPPER_CONSTANTS.DEFAULT_WIDTH}px`,
      height: `${height || CROPPER_CONSTANTS.DEFAULT_HEIGHT}px`,
    }"
    class="cropper-action-wrapper"
  >
    <div
      ref="containerRef"
      class="cropper-container"
      :style="{
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
      }"
    >
      <!-- Original image display - adaptive size -->
      <img
        ref="bgImageRef"
        class="cropper-image"
        :src="img"
        @load="handleImageLoad"
        :style="{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }"
        alt="Crop source image"
      />

      <!-- Mask overlay -->
      <div
        class="cropper-mask"
        :style="{
          display: isCropperVisible ? 'block' : 'none',
          width: '100%',
          height: '100%',
        }"
      >
        <div
          ref="maskViewRef"
          class="cropper-mask-view"
          :style="{
            backgroundImage: `url(${img})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            clipPath: `inset(${currentDimension[0]}px ${currentDimension[1]}px ${currentDimension[2]}px ${currentDimension[3]}px)`,
            width: '100%',
            height: '100%',
          }"
        ></div>
      </div>

      <!-- Crop box -->
      <div
        ref="cropperRef"
        class="cropper-box"
        :style="{
          display: isCropperVisible ? 'block' : 'none',
          width: '100%',
          height: '100%',
        }"
      >
        <div
          class="cropper-view"
          :style="{
            inset: `${currentDimension[0]}px ${currentDimension[1]}px ${currentDimension[2]}px ${currentDimension[3]}px`,
          }"
        >
          <!-- Crop box guide lines -->
          <span class="cropper-dashed-h"></span>
          <span class="cropper-dashed-v"></span>

          <!-- Crop box drag area -->
          <span
            class="cropper-move-area"
            @mousedown="handleMouseDown($event, 'move')"
          ></span>

          <!-- Border lines -->
          <span class="cropper-line-e"></span>
          <span class="cropper-line-n"></span>
          <span class="cropper-line-w"></span>
          <span class="cropper-line-s"></span>

          <!-- Corner resize handles -->
          <span
            class="cropper-point cropper-point-ne"
            @mousedown="handleMouseDown($event, 'top-right')"
          >
            <span class="cropper-point-inner"></span>
          </span>
          <span
            class="cropper-point cropper-point-nw"
            @mousedown="handleMouseDown($event, 'top-left')"
          >
            <span class="cropper-point-inner"></span>
          </span>
          <span
            class="cropper-point cropper-point-sw"
            @mousedown="handleMouseDown($event, 'bottom-left')"
          >
            <span class="cropper-point-inner"></span>
          </span>
          <span
            class="cropper-point cropper-point-se"
            @mousedown="handleMouseDown($event, 'bottom-right')"
          >
            <span class="cropper-point-inner"></span>
          </span>

          <!-- Edge midpoint resize handles -->
          <span
            class="cropper-point cropper-point-e"
            @mousedown="handleMouseDown($event, 'right')"
          >
            <span class="cropper-point-inner"></span>
          </span>
          <span
            class="cropper-point cropper-point-n"
            @mousedown="handleMouseDown($event, 'top')"
          >
            <span class="cropper-point-inner"></span>
          </span>
          <span
            class="cropper-point cropper-point-w"
            @mousedown="handleMouseDown($event, 'left')"
          >
            <span class="cropper-point-inner"></span>
          </span>
          <span
            class="cropper-point cropper-point-s"
            @mousedown="handleMouseDown($event, 'bottom')"
          >
            <span class="cropper-point-inner"></span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "@operon/tailwind-config/theme";

.cropper-action-wrapper {
  @apply box-border flex items-center justify-center;

  background-color: transparent;

  /* Mosaic background */
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
  background-size: 20px 20px;
}

.cropper-container {
  @apply relative;
}

.cropper-image {
  @apply block;
}

/* Overlay mask */
.cropper-mask {
  @apply absolute top-0 left-0 bg-black/50;
}

.cropper-mask-view {
  @apply absolute top-0 left-0;
}

/* Crop box */
.cropper-box {
  @apply absolute top-0 left-0 z-10;
}

.cropper-view {
  @apply absolute top-0 right-0 bottom-0 left-0 outline-1 outline-primary select-none;
}

/* Crop box guides */
.cropper-dashed-h {
  @apply absolute top-1/3 left-0 block h-1/3 w-full border-t border-b border-dashed border-border/50;
}

.cropper-dashed-v {
  @apply absolute top-0 left-1/3 block h-full w-1/3 border-r border-l border-dashed border-border/50;
}

/* Crop box drag area */
.cropper-move-area {
  @apply absolute top-0 left-0 block h-full w-full cursor-move bg-primary-foreground/10;
}

/* Border drag handle lines */
.cropper-line-e,
.cropper-line-n,
.cropper-line-w,
.cropper-line-s {
  @apply absolute block bg-primary/10;
}

.cropper-line-e {
  @apply top-0 -right-0.75 h-full w-1;
}

.cropper-line-n {
  @apply -top-0.75 left-0 h-1 w-full;
}

.cropper-line-w {
  @apply top-0 -left-0.75 h-full w-1;
}

.cropper-line-s {
  @apply -bottom-0.75 left-0 h-1 w-full;
}

/* Drag points */
.cropper-point {
  @apply absolute flex h-2 w-2 items-center justify-center bg-primary;
}

.cropper-point-inner {
  @apply block h-1.5 w-1.5 bg-primary-foreground;
}

/* Corner drag handle positions and cursors */
.cropper-point-ne {
  @apply -top-1.25 -right-1.25 cursor-ne-resize;
}

.cropper-point-nw {
  @apply -top-1.25 -left-1.25 cursor-nw-resize;
}

.cropper-point-sw {
  @apply -bottom-1.25 -left-1.25 cursor-sw-resize;
}

.cropper-point-se {
  @apply -right-1.25 -bottom-1.25 cursor-se-resize;
}

/* Edge midpoint drag handle positions and cursors */
.cropper-point-e {
  @apply top-1/2 -right-1.25 -mt-1 cursor-e-resize;
}

.cropper-point-n {
  @apply -top-1.25 left-1/2 -ml-1 cursor-n-resize;
}

.cropper-point-w {
  @apply top-1/2 -left-1.25 -mt-1 cursor-w-resize;
}

.cropper-point-s {
  @apply -bottom-1.25 left-1/2 -ml-1 cursor-s-resize;
}
</style>
