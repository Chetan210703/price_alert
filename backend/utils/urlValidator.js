// URL validation utility

// Supported e-commerce sites
const SUPPORTED_SITES = [
    'amazon.in',
    'amazon.com',
    'flipkart.com',
    'vijaysales.com'
];

// Common invalid/unsupported sites (social media, etc.)
const UNSUPPORTED_SITES = [
    'instagram.com',
    'facebook.com',
    'twitter.com',
    'x.com',
    'youtube.com',
    'linkedin.com',
    'pinterest.com',
    'tiktok.com',
    'snapchat.com',
    'whatsapp.com',
    'telegram.org',
    'reddit.com',
    'discord.com',
    'gmail.com',
    'google.com',
    'yahoo.com',
    'outlook.com'
];

/**
 * Validates if a URL is from a supported e-commerce site
 * @param {string} url - The URL to validate
 * @returns {Object} - { valid: boolean, error?: string, site?: string }
 */
export function validateProductUrl(url) {
    // Check if URL is provided
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return {
            valid: false,
            error: 'URL is required'
        };
    }

    // Validate URL format
    let urlObj;
    try {
        urlObj = new URL(url.trim());
    } catch (error) {
        return {
            valid: false,
            error: 'Invalid URL format. Please enter a valid URL (e.g., https://www.amazon.in/product)'
        };
    }

    // Check protocol (must be http or https)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
            valid: false,
            error: 'URL must use HTTP or HTTPS protocol'
        };
    }

    const hostname = urlObj.hostname.toLowerCase();
    const domain = hostname.replace(/^www\./, '');

    // Check for unsupported sites (social media, etc.)
    for (const unsupportedSite of UNSUPPORTED_SITES) {
        if (domain.includes(unsupportedSite)) {
            return {
                valid: false,
                error: `Unsupported site: ${unsupportedSite}. Please use Amazon, Flipkart, or Vijay Sales product URLs.`
            };
        }
    }

    // Check if it's a supported site
    let detectedSite = null;
    for (const supportedSite of SUPPORTED_SITES) {
        if (domain.includes(supportedSite)) {
            if (supportedSite.includes('amazon')) {
                detectedSite = 'amazon';
            } else if (supportedSite.includes('flipkart')) {
                detectedSite = 'flipkart';
            } else if (supportedSite.includes('vijaysales')) {
                detectedSite = 'vijaysales';
            }
            break;
        }
    }

    if (!detectedSite) {
        return {
            valid: false,
            error: 'Unsupported website. Currently supported sites: Amazon, Flipkart, and Vijay Sales. Please use a product URL from one of these sites.'
        };
    }

    // Additional validation: Check if URL looks like a product page
    // Product URLs typically have paths, not just domain
    if (urlObj.pathname === '/' || urlObj.pathname.length < 3) {
        return {
            valid: false,
            error: 'This appears to be a homepage URL. Please use a direct product page URL.'
        };
    }

    return {
        valid: true,
        site: detectedSite,
        normalizedUrl: url.trim()
    };
}

/**
 * Get list of supported sites
 */
export function getSupportedSites() {
    return SUPPORTED_SITES.map(site => {
        if (site.includes('amazon')) {
            return { name: 'amazon', displayName: 'Amazon', urlPattern: 'amazon.in, amazon.com' };
        } else if (site.includes('flipkart')) {
            return { name: 'flipkart', displayName: 'Flipkart', urlPattern: 'flipkart.com' };
        } else if (site.includes('vijaysales')) {
            return { name: 'vijaysales', displayName: 'Vijay Sales', urlPattern: 'vijaysales.com' };
        }
        return null;
    }).filter(Boolean);
}

