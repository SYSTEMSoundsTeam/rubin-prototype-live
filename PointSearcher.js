// Description: Example usage of KDTree class to find k nearest neighbours within a radius of a target point
class PointSearcher {
    constructor(points) {
        this.tree = new KDTree(points); // Create a KDTree from the points;
        this.radius_subset = 200; // Radius for finding the subset of points
        this.radius_neighbours = this.radius_subset/2; // Radius for finding the nearest neighbours
        this.k_neighbours = 50; // Number of nearest neighbours to find in subset

        this.subsetPoints = {}; // Subset of points within the radius
        this.subsetTree = {}; // KDTree for the subset      
        this.nearestNeighbours = {}; // Array to store the nearest neighbours
        this.nearestPoint = undefined; // Object to store the nearest neighbour
        this.previousNearestNeighbourIDs = []; // Store IDs of previous nearest neighbours
        this.newNearestNeighbours = []; // Store new nearest neighbours

        this.animations = []; // Array to store active animations
    }

    makeSubset(target_pixel, radius = this.radius_subset) {
        this.radius_subset = radius; // Update the radius for the subset
        this.subsetPoints = this.tree.range(target_pixel, radius); // Find subset of points within radius
        this.subsetTree = new KDTree(this.subsetPoints); // Create a KDTree from the subset
    }

    findNeighbours(target_pixel, radius = this.radius_neighbours) {
        this.radius_neighbours = radius; // Update the radius for finding nearest neighbours
    
        // Find nearest neighbours using the KDTree
        this.nearestNeighbours = this.subsetTree.kNearest(target_pixel, this.k_neighbours, radius);

        // Get the IDs of the current nearest neighbours
        const currentNearestNeighbourIDs = this.nearestNeighbours.map(point => point.id);
    
        // Find new nearest neighbours (present in current but not in previous)
        if (this.previousNearestNeighbourIDs.length === 0) {
            this.newNearestNeighbours = [];
        } else {
            this.newNearestNeighbours = this.nearestNeighbours.filter(
            neighbour => !this.previousNearestNeighbourIDs.includes(neighbour.id)
            );
        }

        // Add animations for new nearest neighbours
        if (this.newNearestNeighbours && this.newNearestNeighbours.length > 0) {
            for (let neighbour of this.newNearestNeighbours) {
                this.addAnimation(neighbour);
            }
        }
    
        // Update the previous nearest neighbours
        this.previousNearestNeighbourIDs = currentNearestNeighbourIDs;
    
        // Update the nearest point
        if (this.nearestNeighbours.length > 0) {
            this.nearestPoint = this.nearestNeighbours[0];
        } else {
            this.nearestPoint = undefined;
        }
    }

    addAnimation(neighbour) {
        // Convert the neighbour's position to canvas coordinates
        //let point_i = image2canvas(neighbour.point[0], neighbour.point[1]);
        this.animations.push({
            x: neighbour.point[0],
            y: neighbour.point[1],
            size: 0, // Initial size
            opacity: 255, // Initial opacity
        });
    }

    updateAndDrawAnimations() {
        noFill();
        for (let i = this.animations.length - 1; i >= 0; i--) {
            let anim = this.animations[i];

            // Draw the circle
            stroke(255, 255, 255, anim.opacity); // Yellow with fading opacity

            let point_i = image2canvas(anim.x, anim.y);
            ellipse(point_i[0], point_i[1], anim.size);

            // Update the animation state
            anim.size += 2; // Increase size
            anim.opacity -= 10; // Decrease opacity

            // Remove the animation if it's complete
            if (anim.opacity <= 0) {
                this.animations.splice(i, 1); // Remove this animation
            }
        }
    }

}


class Node {
    constructor(point, axis, id, color, color_br, size, type) {
        this.point = point;
        this.left = null;
        this.right = null;
        this.axis = axis;
        this.id = id;
        this.color = color;
        this.color_br = color_br;
        this.size = size;
        this.type = type;
    }
}

class KDTree {
    constructor(points) {
        this.root = this.buildTree(points);
    }

    buildTree(points) {
        if (points.length === 0) {
            return null;
        }

        const k = points[0].point.length;
        let depth = 0;
        const stack = [{ points, depth }];
        let root = null;

        while (stack.length > 0) {
            const { points, depth } = stack.pop();
            const axis = depth % k;

            if (points.length === 0) {
                continue;
            }

            points.sort((a, b) => a.point[axis] - b.point[axis]);
            const median = Math.floor(points.length / 2);

            const node = new Node(points[median].point, axis, points[median].id, points[median].color,points[median].color_br, points[median].size, points[median].type);
            if (root === null) {
                root = node;
            } else {
                let current = root;
                while (true) {
                    if (points[median].point[current.axis] < current.point[current.axis]) {
                        if (current.left === null) {
                            current.left = node;
                            break;
                        } else {
                            current = current.left;
                        }
                    } else {
                        if (current.right === null) {
                            current.right = node;
                            break;
                        } else {
                            current = current.right;
                        }
                    }
                }
            }

            stack.push({ points: points.slice(0, median), depth: depth + 1 });
            stack.push({ points: points.slice(median + 1), depth: depth + 1 });
        }

        return root;
    }

    kNearest(point, k, radius) {
        const bestNodes = [];
        const stack = [{ node: this.root, depth: 0 }];

        while (stack.length > 0) {
            const { node, depth } = stack.pop();
            if (node === null) {
                continue;
            }

            const axis = node.axis;
            const dist = this.distance(point, node.point);

            if (dist <= radius) {
                if (bestNodes.length < k) {
                    bestNodes.push({ point: node.point, dist, id: node.id , color: node.color, color_br: node.color_br, size: node.size, type : node.type});
                    bestNodes.sort((a, b) => a.dist - b.dist);
                } else if (dist < bestNodes[bestNodes.length - 1].dist) {
                    bestNodes[bestNodes.length - 1] = { point: node.point, dist, id: node.id, color: node.color, color_br: node.color_br, size: node.size, type : node.type};
                    bestNodes.sort((a, b) => a.dist - b.dist);
                }
            }

            const diff = point[axis] - node.point[axis];
            const closeBranch = diff < 0 ? node.left : node.right;
            const awayBranch = diff < 0 ? node.right : node.left;

            stack.push({ node: closeBranch, depth: depth + 1 });
            if (Math.abs(diff) < radius || bestNodes.length < k) {
                stack.push({ node: awayBranch, depth: depth + 1 });
            }
        }

        return bestNodes//.map(node => node.id);
    }

    distance(point1, point2) {
        return Math.sqrt(point1.reduce((sum, val, idx) => sum + Math.pow(val - point2[idx], 2), 0));
    }

    range(targetPoint, radius) {
        const pointsInRange = [];
        const stack = [{ node: this.root, depth: 0 }];

        while (stack.length > 0) {
            const { node, depth } = stack.pop();
            if (node === null) {
                continue;
            }

            const axis = node.axis;
            const dist = this.distance(targetPoint, node.point);

            // If the point is within the radius, add it to the result
            if (dist <= radius) {
                pointsInRange.push({ point: node.point, id: node.id , color: node.color,color_br: node.color_br, size: node.size, type : node.type});
            }

            const diff = targetPoint[axis] - node.point[axis];
            const closeBranch = diff < 0 ? node.left : node.right;
            const awayBranch = diff < 0 ? node.right : node.left;

            // Always check the closer branch
            stack.push({ node: closeBranch, depth: depth + 1 });

            // Check the farther branch if it might contain points within the radius
            if (Math.abs(diff) < radius) {
                stack.push({ node: awayBranch, depth: depth + 1 });
            }
        }

        return pointsInRange;
    }
}