import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// JSON Parsing Error Middleware
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json({ error: "Malformed JSON payload. Please ensure your request body is valid JSON." });
  }
  next();
});

// --- CORE LOGIC HANDLER ---

interface Hierarchy {
  root: string;
  tree: any;
  depth?: number;
  has_cycle?: boolean;
}

class GraphProcessor {
  private userId: string = "ahammed_shameem_11022005";
  private emailId: string = "as1649@srmist.edu.in";
  private rollNumber: string = "RA2311003020179";

  process(data: string[]) {
    const invalid_entries: string[] = [];
    const duplicate_edges: string[] = [];
    const seenEdges = new Set<string>();
    const childToParent = new Map<string, string>();
    const parentsOf = new Map<string, string[]>();
    const nodes = new Set<string>();
    const allValidEdges: [string, string][] = [];

    // 1. Validation & Edge Filtering
    data.forEach((entry) => {
      const trimmed = entry.trim();
      const match = trimmed.match(/^([A-Z])->([A-Z])$/);

      if (!match) {
        invalid_entries.push(trimmed);
        return;
      }

      const [_, parent, child] = match;

      if (parent === child) {
        invalid_entries.push(trimmed);
        return;
      }

      const edgeKey = `${parent}->${child}`;
      if (seenEdges.has(edgeKey)) {
        if (!duplicate_edges.includes(edgeKey)) {
          duplicate_edges.push(edgeKey);
        }
        return;
      }
      seenEdges.add(edgeKey);
      nodes.add(parent);
      nodes.add(child);

      // Multi-parent rule: Keep only first parent
      if (!childToParent.has(child)) {
        childToParent.set(child, parent);
        allValidEdges.push([parent, child]);
        
        if (!parentsOf.has(parent)) parentsOf.set(parent, []);
        parentsOf.get(parent)!.push(child);
      }
    });

    // 2. Identify Components and Roots
    // Roots are nodes that never appear as a child
    const childrenSet = new Set(childToParent.keys());
    const potentialRoots = Array.from(nodes).filter(n => !childrenSet.has(n)).sort();

    const visitedGlobal = new Set<string>();
    const hierarchies: Hierarchy[] = [];

    const getNestedTree = (node: string, path: Set<string>): { tree: any; depth: number; hasCycle: boolean } => {
      if (path.has(node)) {
        return { tree: {}, depth: 0, hasCycle: true };
      }
      
      path.add(node);
      visitedGlobal.add(node);
      
      const children = (parentsOf.get(node) || []).sort();
      const nodeTree: any = {};
      let maxDepth = 0;
      let cycleInSubtree = false;

      for (const child of children) {
        const { tree: childTree, depth: childDepth, hasCycle: childHasCycle } = getNestedTree(child, new Set(path));
        nodeTree[child] = childTree;
        maxDepth = Math.max(maxDepth, childDepth);
        if (childHasCycle) cycleInSubtree = true;
      }
      
      return { 
        tree: nodeTree, 
        depth: 1 + maxDepth, 
        hasCycle: cycleInSubtree 
      };
    };

    // First process all true roots
    potentialRoots.forEach(root => {
      if (!visitedGlobal.has(root)) {
        const { tree, depth, hasCycle } = getNestedTree(root, new Set());
        if (hasCycle) {
            hierarchies.push({ root, tree: {}, has_cycle: true });
        } else {
            hierarchies.push({ root, tree: { [root]: tree }, depth });
        }
      }
    });

    // Handle any remaining nodes (pure cycles)
    const remainingNodes = Array.from(nodes).filter(n => !visitedGlobal.has(n)).sort();
    while (remainingNodes.length > 0) {
      const smallestInCycle = remainingNodes[0];
      const { tree, hasCycle } = getNestedTree(smallestInCycle, new Set());
      hierarchies.push({ root: smallestInCycle, tree: {}, has_cycle: true });
      
      // Update remaining nodes list
      remainingNodes.splice(0, remainingNodes.length, ...Array.from(nodes).filter(n => !visitedGlobal.has(n)).sort());
    }

    // 3. Summary
    const validTrees = hierarchies.filter(h => !h.has_cycle);
    const total_trees = validTrees.length;
    const total_cycles = hierarchies.filter(h => h.has_cycle).length;

    let largest_tree_root = "";
    if (validTrees.length > 0) {
      const sortedValid = [...validTrees].sort((a, b) => {
        if ((b.depth || 0) !== (a.depth || 0)) {
          return (b.depth || 0) - (a.depth || 0);
        }
        return a.root.localeCompare(b.root);
      });
      largest_tree_root = sortedValid[0].root;
    }

    return {
      user_id: this.userId,
      email_id: this.emailId,
      college_roll_number: this.rollNumber,
      hierarchies,
      invalid_entries,
      duplicate_edges,
      summary: {
        total_trees,
        total_cycles,
        largest_tree_root,
      },
    };
  }
}

const processor = new GraphProcessor();

// --- API ROUTES ---

app.post("/bfhl", (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ 
        error: "Input must be a JSON object containing a 'data' array of strings." 
      });
    }

    const isAllStrings = data.every(item => typeof item === 'string');
    if (!isAllStrings) {
      return res.status(400).json({ 
        error: "All elements in the 'data' array must be strings." 
      });
    }

    const result = processor.process(data);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
