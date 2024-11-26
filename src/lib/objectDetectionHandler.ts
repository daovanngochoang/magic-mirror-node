import { ObjectDetectionModel } from "./detectObject";

class ObjectDetectionHandler {
    private model: ObjectDetectionModel;
    private detectionCounts: Map<string, number>;
    private maxCount: number;

    constructor(model: ObjectDetectionModel, maxCount: number) {
        this.model = model;
        this.detectionCounts = new Map();
        this.maxCount = maxCount;
    }

    async loadModel(): Promise<void> {
        await this.model.loadModel();
    }

    resetDetectionCounts(): void {
        this.detectionCounts.clear();
    }

    updateDetectionCount(objectName: string): void {
        const count = this.detectionCounts.get(objectName) || 0;
        this.detectionCounts.set(objectName, count + 1);
    }

    getMostDetectedObject(): string | null {
        const [objectName] = Array.from(this.detectionCounts.entries()).reduce(
            (maxEntry, currentEntry) => (currentEntry[1] > maxEntry[1] ? currentEntry : maxEntry),
            ['', 0]
        );
        return this.detectionCounts.get(objectName)! > this.maxCount ? objectName : null;
    }
}
export default ObjectDetectionHandler;