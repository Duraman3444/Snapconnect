// Image debugging utility to help identify image loading issues
export const debugImageUrl = async (url) => {
  console.log('🔍 Debugging image URL:', url);
  
  if (!url) {
    console.error('❌ URL is null or undefined');
    return false;
  }

  try {
    // Test with a simple fetch first
    console.log('🌐 Testing URL with fetch...');
    const response = await fetch(url, {
      method: 'HEAD', // Just check headers, don't download
      headers: {
        'Accept': 'image/*',
        'Cache-Control': 'no-cache'
      }
    });

    console.log('📊 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ URL is accessible via fetch');
      return true;
    } else {
      console.error('❌ URL returned error status:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Fetch failed:', error.message);
    
    // Try to identify the specific error type
    if (error.message.includes('Network request failed')) {
      console.error('🌐 Network error - check internet connection');
    } else if (error.message.includes('CORS')) {
      console.error('🔒 CORS error - server doesn't allow this origin');
    } else if (error.message.includes('timeout')) {
      console.error('⏰ Timeout error - request took too long');
    }
    
    return false;
  }
};

export const testImageUrls = async (urls) => {
  console.log('🧪 Testing multiple image URLs...');
  
  for (let i = 0; i < urls.length; i++) {
    console.log(`\n--- Testing URL ${i + 1}/${urls.length} ---`);
    await debugImageUrl(urls[i]);
  }
};

// Test specific Supabase patterns
export const testSupabaseImageUrl = async (url) => {
  console.log('🔍 Testing Supabase image URL:', url);
  
  // Check URL format
  if (url.includes('/storage/v1/object/public/')) {
    console.log('📋 URL type: Public URL');
  } else if (url.includes('/storage/v1/object/sign/')) {
    console.log('📋 URL type: Signed URL');
  } else {
    console.warn('⚠️ Unknown URL type');
  }
  
  // Extract bucket and path
  const urlParts = url.split('/');
  const bucketIndex = urlParts.findIndex(part => part === 'media');
  if (bucketIndex > -1) {
    const path = urlParts.slice(bucketIndex + 1).join('/').split('?')[0];
    console.log('📁 Bucket: media');
    console.log('📄 Path:', path);
  }
  
  return await debugImageUrl(url);
};