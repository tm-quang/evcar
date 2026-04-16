
/**
 * Android Native Bridge
 * Handles communication between Web and Android Native App
 */

declare global {
    interface Window {
        Android?: {
            startScan: () => void;
            showToast?: (message: string) => void;
            openCamera?: () => void;
            openGallery?: () => void;
        };
        // The global callback function that Android will call
        onNativeScanResult?: (result: string) => void;
        // Global callback for QR code scanned results (can be called by external systems)
        onQRCodeScanned?: (scanResult: string) => void;
        // Global callback for native image selection results
        onNativeImageResult?: (base64Data: string) => void;
    }
}

/**
 * Check if running inside the Android Native App
 */
export const isAndroidApp = (): boolean => {
    return typeof window !== 'undefined' && !!window.Android;
};

/**
 * Trigger the native camera scanner
 */
export const startNativeScan = (): void => {
    if (isAndroidApp()) {
        console.log('Starting native scan...');
        window.Android?.startScan();
    } else {
        console.warn('Android interface not found. Make sure you are running in the native app.');
    }
};

/**
 * Trigger the native camera for taking photos
 */
export const openNativeCamera = (): void => {
    if (isAndroidApp() && window.Android?.openCamera) {
        console.log('Opening native camera...');
        window.Android.openCamera();
    } else {
        console.warn('Android camera interface not found.');
    }
};

/**
 * Trigger the native gallery for selecting photos
 */
export const openNativeGallery = (): void => {
    if (isAndroidApp() && window.Android?.openGallery) {
        console.log('Opening native gallery...');
        window.Android.openGallery();
    } else {
        console.warn('Android gallery interface not found.');
    }
};

/**
 * Setup the global callback for scan results
 * @param callback Function to handle the scanned result
 */
export const setupNativeScanCallback = (callback: (result: string) => void) => {
    window.onNativeScanResult = (result: string) => {
        console.log('Received native scan result:', result);

        // Call the provided callback
        callback(result);

        // Also trigger the global onQRCodeScanned function if it exists
        // This ensures external systems can also receive the result
        if (typeof window.onQRCodeScanned === 'function') {
            try {
                window.onQRCodeScanned(result);
            } catch (error) {
                console.error('Error calling onQRCodeScanned:', error);
            }
        }
    };
};

/**
 * Setup the global callback for image results (camera/gallery)
 * @param callback Function to handle the image result (base64)
 */
export const setupNativeImageCallback = (callback: (base64Data: string) => void) => {
    window.onNativeImageResult = (base64Data: string) => {
        console.log('Received native image result'); // Don't log full base64 to avoid clutter
        callback(base64Data);
    };
};

/**
 * Cleanup the global callbacks
 */
export const cleanupNativeCallbacks = () => {
    if (typeof window !== 'undefined') {
        window.onNativeScanResult = undefined;
        window.onNativeImageResult = undefined;
    }
};

/**
 * Cleanup the global callback (scan only - deprecated in favor of cleanupNativeCallbacks)
 */
export const cleanupNativeScanCallback = () => {
    if (typeof window !== 'undefined') {
        window.onNativeScanResult = undefined;
    }
};

