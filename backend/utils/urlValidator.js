// URL validation utility

const SITE_CONFIGS = [
    {
        name: 'amazon',
        displayName: 'Amazon',
        urlPattern: 'amazon.in, amazon.com, amzn.in',
        domains: ['amazon.in', 'amazon.com', 'amzn.in', 'amzn.to']
    },
    {
        name: 'flipkart',
        displayName: 'Flipkart',
        urlPattern: 'flipkart.com',
        domains: ['flipkart.com']
    },
    {
        name: 'vijaysales',
        displayName: 'Vijay Sales',
        urlPattern: 'vijaysales.com',
        domains: ['vijaysales.com']
    }
];

const UNSUPPORTED_SITES = [
    'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
    'youtube.com', 'linkedin.com', 'pinterest.com', 'tiktok.com',
    'snapchat.com', 'whatsapp.com', 'telegram.org', 'reddit.com',
    'discord.com', 'gmail.com', 'google.com', 'yahoo.com', 'outlook.com'
];

const AMAZON_ASIN_PATTERNS = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
];

function hostMatchesDomain(hostname, supportedDomain) {
    const host = hostname.toLowerCase().replace(/^www\./, '');
    return host === supportedDomain || host.endsWith(`.${supportedDomain}`);
}

function extractAmazonAsin(url) {
    try {
        const pathname = new URL(url).pathname;
        for (const pattern of AMAZON_ASIN_PATTERNS) {
            const match = pathname.match(pattern);
            if (match) {
                return match[1].toUpperCase();
            }
        }
    } catch {
        // ignore parse errors
    }
    return null;
}

function cleanAmazonUrl(url) {
    const asin = extractAmazonAsin(url);
    if (!asin) {
        return url;
    }

    try {
        const hostname = new URL(url).hostname.toLowerCase();
        const tld = hostname.includes('amazon.com') ? 'amazon.com' : 'amazon.in';
        return `https://www.${tld}/dp/${asin}`;
    } catch {
        return url;
    }
}

function cleanFlipkartUrl(url) {
    try {
        const urlObj = new URL(url);
        const pid = urlObj.searchParams.get('pid');

        urlObj.hash = '';
        urlObj.search = pid ? `?pid=${encodeURIComponent(pid)}` : '';

        if (hostMatchesDomain(urlObj.hostname, 'flipkart.com')) {
            urlObj.protocol = 'https:';
            urlObj.hostname = 'www.flipkart.com';
        }

        return urlObj.toString();
    } catch {
        return url;
    }
}

function cleanVijaySalesUrl(url) {
    try {
        const urlObj = new URL(url);
        urlObj.hash = '';
        urlObj.search = '';
        return `https://www.vijaysales.com${urlObj.pathname.replace(/\/$/, '')}`;
    } catch {
        return url;
    }
}

function isLikelyProductUrl(urlObj, site) {
    const path = urlObj.pathname.toLowerCase();

    switch (site) {
        case 'amazon':
            return extractAmazonAsin(urlObj.href) !== null
                || urlObj.hostname.toLowerCase().includes('amzn.');
        case 'flipkart':
            return path.includes('/p/')
                || path.includes('/dl/')
                || urlObj.searchParams.has('pid');
        case 'vijaysales':
            return path.length > 1
                && !['/search', '/cart', '/account', '/login'].some((prefix) => path.startsWith(prefix));
        default:
            return true;
    }
}

export function validateProductUrl(url) {
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return { valid: false, error: 'URL is required' };
    }

    let urlObj;
    try {
        urlObj = new URL(url.trim());
    } catch {
        return {
            valid: false,
            error: 'Invalid URL format. Please enter a valid URL (e.g., https://www.amazon.in/product)'
        };
    }

    if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }

    const hostname = urlObj.hostname.toLowerCase();

    for (const unsupportedSite of UNSUPPORTED_SITES) {
        if (hostMatchesDomain(hostname, unsupportedSite)) {
            return {
                valid: false,
                error: `Unsupported site: ${unsupportedSite}. Please use Amazon, Flipkart, or Vijay Sales product URLs.`
            };
        }
    }

    let detectedSite = null;
    for (const config of SITE_CONFIGS) {
        const matchesDomain = config.domains.some((supportedDomain) =>
            hostMatchesDomain(hostname, supportedDomain)
        );
        if (matchesDomain) {
            detectedSite = config.name;
            break;
        }
    }

    if (!detectedSite) {
        const supportedNames = SITE_CONFIGS.map((c) => c.displayName).join(', ');
        return {
            valid: false,
            error: `Unsupported website. Currently supported sites: ${supportedNames}. Please use a product URL from one of these sites.`
        };
    }

    if (urlObj.pathname === '/' || urlObj.pathname.length < 3) {
        return {
            valid: false,
            error: 'This appears to be a homepage URL. Please use a direct product page URL.'
        };
    }

    if (!isLikelyProductUrl(urlObj, detectedSite)) {
        return {
            valid: false,
            error: 'This does not look like a product page URL. Please paste a direct link to the product.'
        };
    }

    let normalizedUrl = url.trim();
    if (detectedSite === 'amazon') {
        normalizedUrl = cleanAmazonUrl(normalizedUrl);
    } else if (detectedSite === 'flipkart') {
        normalizedUrl = cleanFlipkartUrl(normalizedUrl);
    } else if (detectedSite === 'vijaysales') {
        normalizedUrl = cleanVijaySalesUrl(normalizedUrl);
    }

    return {
        valid: true,
        site: detectedSite,
        normalizedUrl
    };
}

export function getSupportedSites() {
    return SITE_CONFIGS.map(({ name, displayName, urlPattern }) => ({
        name,
        displayName,
        urlPattern
    }));
}
