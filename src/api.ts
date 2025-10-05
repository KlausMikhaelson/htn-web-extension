// API service for communicating with backend
// Base URL for your API - update this with your actual API URL
const API_BASE_URL = 'http://localhost:3000/api';

// API Key for authentication - REPLACE WITH YOUR ACTUAL KEY
// Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Must match EXTENSION_API_KEY in your backend .env file
const API_KEY = 'your_secure_random_key_here'; // TODO: Replace with your actual API key

interface PurchaseData {
  item_name: string;
  price: number;
  currency?: string;
  website: string;
  url?: string;
  description?: string;
  purchase_date?: string;
  metadata?: Record<string, any>;
}

interface PurchaseResponse {
  success: boolean;
  purchase?: {
    id: string;
    item_name: string;
    price: number;
    currency: string;
    category: string;
    website: string;
    url?: string;
    description?: string;
    purchase_date: string;
    created_at: string;
  };
  message?: string;
  error?: string;
}

interface PurchaseListResponse {
  success: boolean;
  purchases: Array<{
    id: string;
    item_name: string;
    price: number;
    currency: string;
    category: string;
    website: string;
    purchase_date: string;
    created_at: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  statistics: {
    total_purchases: number;
    total_spent: number;
    category_breakdown: Record<string, { total_spent: number; count: number }>;
  };
}

// Get user ID for API calls
async function getUserId(): Promise<string | null> {
  const result = await chrome.storage.local.get(['user']);
  return result.user?.id || null;
}

/**
 * Add a new purchase to the database
 */
export async function addPurchase(purchaseData: PurchaseData): Promise<PurchaseResponse> {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      throw new Error('User not authenticated - user ID not found');
    }

    const response = await fetch(`${API_BASE_URL}/purchases/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY, // API key for authentication
      },
      body: JSON.stringify({
        ...purchaseData,
        user_id: userId, // Add user ID for backend
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to add purchase');
    }

    return data;
  } catch (error) {
    console.error('Error adding purchase:', error);
    throw error;
  }
}

/**
 * Get list of user's purchases
 */
export async function getPurchases(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  start_date?: string;
  end_date?: string;
  sort?: 'asc' | 'desc';
}): Promise<PurchaseListResponse> {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      throw new Error('User not authenticated - user ID not found');
    }

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.sort) queryParams.append('sort', params.sort);

    const url = `${API_BASE_URL}/purchases/list?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY, // API key for authentication
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch purchases');
    }

    return data;
  } catch (error) {
    console.error('Error fetching purchases:', error);
    throw error;
  }
}

/**
 * Update API base URL (for configuration)
 */
export function setApiBaseUrl(url: string): void {
  // You can store this in chrome.storage if needed
  console.log('API base URL would be set to:', url);
  // For now, you'll need to manually update API_BASE_URL constant above
}

/**
 * Check if purchase would exceed spending limit and get roast message
 */
export async function checkSpending(itemName: string, price: number): Promise<{
  is_overspending: boolean;
  roast_message?: string;
  spent_today: number;
  daily_limit: number;
  new_total: number;
  overspend_amount?: number;
}> {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      throw new Error('User not authenticated - user ID not found');
    }

    const response = await fetch(`${API_BASE_URL}/purchases/check-spending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        user_id: userId,
        item_name: itemName,
        price: price
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to check spending');
    }

    return data;
  } catch (error) {
    console.error('Error checking spending:', error);
    throw error;
  }
}

/**
 * Initialize default goals for user (call on first sign-in)
 */
export async function initializeGoals(): Promise<void> {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      throw new Error('User not authenticated - user ID not found');
    }

    const response = await fetch(`${API_BASE_URL}/goals/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        user_id: userId
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // If goal already exists, that's fine
      if (data.error?.includes('already exists')) {
        console.log('Goals already initialized');
        return;
      }
      throw new Error(data.error || 'Failed to initialize goals');
    }

    console.log('✅ Goals initialized:', data);
  } catch (error) {
    console.error('Error initializing goals:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Test API connection
 */
export async function testApiConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
}
