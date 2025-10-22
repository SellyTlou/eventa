class ActivityQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.maxRetries = 2;
        this.API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';
    }

    // Add activity to queue - completely silent
    enqueue(activity) {
        const queueItem = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            retryCount: 0,
            ...activity
        };
        
        this.queue.push(queueItem);
        
        // Start processing silently if not already running
        if (!this.isProcessing) {
            this.processQueue();
        }
        
        return true;
    }

    // Process the queue silently
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.queue.length > 0) {
            const activity = this.queue[0];
            
            try {
                await this.sendActivity(activity);
                this.queue.shift();
            } catch (error) {
                if (activity.retryCount < this.maxRetries) {
                    activity.retryCount++;
                    this.queue.shift();
                    this.queue.push(activity);
                    await new Promise(resolve => setTimeout(resolve, 1000 * activity.retryCount));
                } else {
                    this.queue.shift();
                }
            }
        }
        
        this.isProcessing = false;
    }

    // Send activity to backend
    async sendActivity(activity) {
        const formData = new FormData();
        formData.append('function', 'logSystemActivity');
        formData.append('user_id', activity.userId);
        formData.append('action', activity.action);
        formData.append('description', activity.description);
        
        const response = await fetch(`${this.API_BASE_URL}/query.php`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (!data.success) throw new Error('Failed to log activity');
        
        return data;
    }
}

const activityQueue = new ActivityQueue();
export default activityQueue;