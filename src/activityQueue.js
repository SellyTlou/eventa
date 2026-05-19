// src/activityQueue.js
class ActivityQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.batchSize = 5; // Process 5 activities at once
        this.maxRetries = 3;
        this.processingInterval = 3000; // Process every 3 seconds
        this.retryDelay = 2000; // Wait 2 seconds before retry
        this.API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';
        
        // Start processing when queue has items
        this.startQueueProcessor();
    }

    // Add activity to queue
    enqueue(activity) {
        const queueItem = {
            ...activity,
            id: Date.now() + Math.random(),
            retries: 0,
            timestamp: new Date(),
            status: 'queued'
        };

        this.queue.push(queueItem);
        console.log(`Activity queued: ${activity.action}. Queue size: ${this.queue.length}`);
        
        // Start processing if not already running
        if (!this.isProcessing) {
            this.processQueue();
        }

        return queueItem.id;
    }

    // Start background processor
    startQueueProcessor() {
        // Process queue every X seconds even if no new activities
        setInterval(() => {
            if (this.queue.length > 0 && !this.isProcessing) {
                this.processQueue();
            }
        }, this.processingInterval);
    }

    // Process the queue
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;
        
        try {
            // Take a batch from the queue
            const batch = this.queue.splice(0, this.batchSize);
            console.log(`Processing batch of ${batch.length} activities`);
            
            await this.processBatch(batch);
        } catch (error) {
            console.error('Queue processing error:', error);
        } finally {
            this.isProcessing = false;
            
            // Continue processing if more items
            if (this.queue.length > 0) {
                setTimeout(() => this.processQueue(), 1000);
            }
        }
    }

    // Process a batch of activities
    async processBatch(batch) {
        const successful = [];
        const failed = [];
        
        // Process each activity in parallel with error handling
        const processingPromises = batch.map(async (activity) => {
            try {
                await this.logActivityToAPI(activity);
                successful.push(activity.id);
                console.log(`✅ Activity logged: ${activity.action}`);
            } catch (error) {
                console.warn(`❌ Failed to log activity: ${activity.action}`, error);
                
                // Retry logic
                if (activity.retries < this.maxRetries) {
                    activity.retries++;
                    activity.status = 'retrying';
                    activity.lastError = error.message;
                    failed.push(activity);
                } else {
                    console.error(`💥 Activity failed after ${this.maxRetries} retries:`, activity);
                    // You could send this to a dead letter queue or alert admin
                }
            }
        });

        await Promise.allSettled(processingPromises);
        
        // Add failed items back to front of queue for retry
        if (failed.length > 0) {
            console.log(`Requeuing ${failed.length} failed activities`);
            this.queue.unshift(...failed);
            
            // Wait before retrying failed items
            setTimeout(() => {
                if (this.queue.length > 0 && !this.isProcessing) {
                    this.processQueue();
                }
            }, this.retryDelay);
        }

        // Log batch summary
        console.log(`Batch completed: ${successful.length} successful, ${failed.length} failed`);
    }

    // Make API call to log activity
    async logActivityToAPI(activity) {
        const formData = new FormData();
        formData.append('function', 'logSystemActivity');
        formData.append('user_id', activity.userId);
        formData.append('action', activity.action);
        formData.append('description', activity.description);
        
        const response = await fetch(`${this.API_BASE_URL}/query.php`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            // Add timeout
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'API returned error');
        }
        
        return data;
    }

    // Utility methods
    getQueueSize() {
        return this.queue.length;
    }

    getQueueStatus() {
        return {
            queueSize: this.queue.length,
            isProcessing: this.isProcessing,
            nextProcessTime: this.isProcessing ? 'Processing...' : 'Soon'
        };
    }

    // Clear queue (useful for testing)
    clearQueue() {
        this.queue = [];
    }
}

// Create singleton instance
const activityQueue = new ActivityQueue();

// Export both the class and singleton instance
export { ActivityQueue, activityQueue };
export default activityQueue;