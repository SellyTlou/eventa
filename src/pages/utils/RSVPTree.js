class BSTNode {
    constructor(data) {
        this.data = data;
        this.left = null;
        this.right = null;
    }
}

export default class RSVPBinaryTree {
    constructor() {
        this.root = null;
    }

    insert(data) {
        const newNode = new BSTNode(data);
        if (!this.root) {
            this.root = newNode;
        }
        else {
            this._insertNode(this.root, newNode);
        }
    }

    _insertNode(node, newNode) {
        const nameA = newNode.data.name?.toLowerCase() || "";
        const nameB = node.data.name?.toLowerCase() || "";

        if (nameA < nameB) {
            node.left ? this._insertNode(node.left, newNode) : (node.left = newNode);
        }
        else {
            node.right ? this._insertNode(node.right, newNode) : (node.right = newNode);
        }
    }

    bulkInsert(dataArray) {
        dataArray.forEach((item) => this.insert(item));
    }

    toArray(order = "asc") {
        const result = [];
        const traverse = (node) => {
            if (!node) return;
            traverse(node.left);
            result.push(node.data);
            traverse(node.right);
        };
        traverse(this.root);
        return order === "asc" ? result : result.reverse();
    }

    uniqueByEmail() {
        const all = this.toArray();
        
        const seen = new Set();

        return all.filter((r) => {
            if (seen.has(r.email)) return false;
            seen.add(r.email);
            return true;
        });
    }

    searchPartial(query) {
        query = query.toLowerCase();
        return this.uniqueByEmail().filter((r) => r.name?.toLowerCase().includes(query));
    }

    filterByAttending(status) {
        if (status === "all") return this.uniqueByEmail();
        return this.uniqueByEmail().filter((r) => r.attending?.toLowerCase() === status);
    }
}
