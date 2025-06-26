import { supabase } from '../../supabaseConfig';
import { debugImageUrl, testSupabaseImageUrl } from './imageDebugger';

// Media cleanup utilities for broken images
export class MediaCleanup {
  
  // Test all image URLs in messages and stories
  static async testAllImageUrls() {
    console.log('🔍 Starting comprehensive image URL testing...');
    
    try {
      // Get all image messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, image_url, created_at, message_type')
        .eq('message_type', 'image')
        .not('image_url', 'is', null);
      
      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return;
      }

      // Get all stories with images
      const { data: stories, error: storiesError } = await supabase
        .from('stories')
        .select('id, image_url, created_at')
        .not('image_url', 'is', null);
      
      if (storiesError) {
        console.error('Error fetching stories:', storiesError);
        return;
      }

      console.log(`📊 Found ${messages.length} image messages and ${stories.length} image stories to test`);
      
      const brokenUrls = [];
      const workingUrls = [];

      // Test message URLs
      for (const message of messages) {
        console.log(`\n📱 Testing message ${message.id} (${message.created_at})`);
        const isWorking = await testSupabaseImageUrl(message.image_url);
        
        if (isWorking) {
          workingUrls.push({
            type: 'message',
            id: message.id,
            url: message.image_url,
            created_at: message.created_at
          });
        } else {
          brokenUrls.push({
            type: 'message',
            id: message.id,
            url: message.image_url,
            created_at: message.created_at
          });
        }
      }

      // Test story URLs
      for (const story of stories) {
        console.log(`\n📖 Testing story ${story.id} (${story.created_at})`);
        const isWorking = await testSupabaseImageUrl(story.image_url);
        
        if (isWorking) {
          workingUrls.push({
            type: 'story',
            id: story.id,
            url: story.image_url,
            created_at: story.created_at
          });
        } else {
          brokenUrls.push({
            type: 'story',
            id: story.id,
            url: story.image_url,
            created_at: story.created_at
          });
        }
      }

      console.log('\n🎯 TESTING RESULTS:');
      console.log(`✅ Working URLs: ${workingUrls.length}`);
      console.log(`❌ Broken URLs: ${brokenUrls.length}`);
      
      if (brokenUrls.length > 0) {
        console.log('\n💥 BROKEN URLS FOUND:');
        brokenUrls.forEach((item, index) => {
          console.log(`${index + 1}. ${item.type} ${item.id}: ${item.url}`);
        });
      }

      return {
        working: workingUrls,
        broken: brokenUrls,
        summary: {
          total: messages.length + stories.length,
          working: workingUrls.length,
          broken: brokenUrls.length
        }
      };

    } catch (error) {
      console.error('Error during image URL testing:', error);
      return null;
    }
  }

  // Delete broken image records from database
  static async deleteBrokenImageRecords() {
    console.log('🗑️ Starting deletion of broken image records...');
    
    try {
      // Run the database cleanup function
      const { data, error } = await supabase.rpc('cleanup_old_media');
      
      if (error) {
        console.error('Error running cleanup function:', error);
        return false;
      }
      
      console.log('✅ Cleanup result:', data);
      return true;
      
    } catch (error) {
      console.error('Error during cleanup:', error);
      return false;
    }
  }

  // Get storage statistics and orphaned files
  static async getStorageStats() {
    console.log('📊 Getting storage statistics...');
    
    try {
      // Get all files in media bucket
      const { data: files, error: filesError } = await supabase.storage
        .from('media')
        .list('', {
          limit: 1000,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (filesError) {
        console.error('Error fetching storage files:', filesError);
        return null;
      }

      // Get all database image references
      const { data: messages } = await supabase
        .from('messages')
        .select('image_url')
        .eq('message_type', 'image')
        .not('image_url', 'is', null);

      const { data: stories } = await supabase
        .from('stories')
        .select('image_url')
        .not('image_url', 'is', null);

      // Extract storage paths from URLs
      const referencedPaths = new Set();
      
      [...(messages || []), ...(stories || [])].forEach(item => {
        const path = this.extractStoragePath(item.image_url);
        if (path) referencedPaths.add(path);
      });

      // Find orphaned files
      const orphanedFiles = files.filter(file => !referencedPaths.has(file.name));
      
      console.log(`📁 Total files in storage: ${files.length}`);
      console.log(`🔗 Referenced files: ${referencedPaths.size}`);
      console.log(`👻 Orphaned files: ${orphanedFiles.length}`);

      return {
        totalFiles: files.length,
        referencedFiles: referencedPaths.size,
        orphanedFiles: orphanedFiles.length,
        orphanedFilesList: orphanedFiles
      };

    } catch (error) {
      console.error('Error getting storage stats:', error);
      return null;
    }
  }

  // Extract storage path from Supabase URL
  static extractStoragePath(imageUrl) {
    if (!imageUrl) return null;
    
    // Handle public URLs
    if (imageUrl.includes('/storage/v1/object/public/media/')) {
      return imageUrl.split('/storage/v1/object/public/media/')[1];
    }
    
    // Handle signed URLs
    if (imageUrl.includes('/storage/v1/object/sign/media/')) {
      const path = imageUrl.split('/storage/v1/object/sign/media/')[1];
      return path.split('?')[0]; // Remove query parameters
    }
    
    return null;
  }

  // Delete orphaned files from storage
  static async deleteOrphanedFiles() {
    console.log('🗑️ Deleting orphaned files from storage...');
    
    const stats = await this.getStorageStats();
    if (!stats || stats.orphanedFiles === 0) {
      console.log('No orphaned files found');
      return;
    }

    console.log(`Found ${stats.orphanedFiles} orphaned files to delete`);
    
    let deletedCount = 0;
    let errorCount = 0;

    for (const file of stats.orphanedFilesList) {
      try {
        const { error } = await supabase.storage
          .from('media')
          .remove([file.name]);
        
        if (error) {
          console.error(`Error deleting ${file.name}:`, error);
          errorCount++;
        } else {
          console.log(`✅ Deleted: ${file.name}`);
          deletedCount++;
        }
      } catch (error) {
        console.error(`Error deleting ${file.name}:`, error);
        errorCount++;
      }
    }

    console.log(`\n🎯 DELETION SUMMARY:`);
    console.log(`✅ Successfully deleted: ${deletedCount} files`);
    console.log(`❌ Failed to delete: ${errorCount} files`);
  }

  // Complete cleanup process
  static async fullCleanup() {
    console.log('🧹 Starting full media cleanup process...');
    
    // Step 1: Test all URLs and identify broken ones
    console.log('\n1️⃣ Testing all image URLs...');
    const testResults = await this.testAllImageUrls();
    
    if (!testResults) {
      console.error('Failed to test URLs');
      return;
    }

    // Step 2: Delete broken database records
    console.log('\n2️⃣ Cleaning up broken database records...');
    await this.deleteBrokenImageRecords();

    // Step 3: Get storage statistics
    console.log('\n3️⃣ Analyzing storage...');
    const stats = await this.getStorageStats();
    
    if (stats) {
      console.log('\n📊 STORAGE ANALYSIS:');
      console.log(`Total files: ${stats.totalFiles}`);
      console.log(`Referenced files: ${stats.referencedFiles}`);
      console.log(`Orphaned files: ${stats.orphanedFiles}`);
    }

    // Step 4: Delete orphaned files (optional - uncomment if you want to delete them automatically)
    // console.log('\n4️⃣ Deleting orphaned files...');
    // await this.deleteOrphanedFiles();

    console.log('\n✅ Full cleanup process completed!');
    
    return {
      urlTests: testResults,
      storageStats: stats
    };
  }
}

// Export individual functions for easier use
export const testAllImageUrls = MediaCleanup.testAllImageUrls.bind(MediaCleanup);
export const deleteBrokenImageRecords = MediaCleanup.deleteBrokenImageRecords.bind(MediaCleanup);
export const getStorageStats = MediaCleanup.getStorageStats.bind(MediaCleanup);
export const deleteOrphanedFiles = MediaCleanup.deleteOrphanedFiles.bind(MediaCleanup);
export const fullCleanup = MediaCleanup.fullCleanup.bind(MediaCleanup);

// Simple usage examples:
// import { fullCleanup, testAllImageUrls } from './utils/mediaCleanup';
// 
// // Test all image URLs
// testAllImageUrls().then(results => console.log(results));
// 
// // Run full cleanup
// fullCleanup().then(results => console.log('Cleanup completed', results)); 