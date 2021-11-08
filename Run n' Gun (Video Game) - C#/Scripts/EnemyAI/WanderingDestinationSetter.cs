using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Pathfinding;

public class WanderingDestinationSetter : MonoBehaviour
{
    public float radius = 10;

    IAstarAI ai;
    GraphNode randomNode;

    void Awake()
    {
        ai = GetComponent<IAstarAI>();
    }

    void Update()
    {
        // Update the destination of the AI if
        // the AI is not already calculating a path and
        // the ai has reached the end of the path or it has no path at all
        if (!ai.pathPending && (ai.reachedEndOfPath || !ai.hasPath))
        {
            /*
            // For grid graphs
            var grid = AstarPath.active.data.gridGraph;

            //Choose a random node in the whole graph
            randomNode = grid.nodes[Random.Range(0, grid.nodes.Length)];
            ai.destination = (Vector3)randomNode.position;

            //Choose a random point in a cycle.
            //ai.destination = Helper.PickRandomPoint(ai.position, radius);
            
            ai.SearchPath();
            */
            PickRandomTarget();
        }
    }

    public void PickRandomTarget()
    {
        var grid = AstarPath.active.data.gridGraph;
        randomNode = grid.nodes[Random.Range(0, grid.nodes.Length)];
        ai.destination = (Vector3)randomNode.position;
        ai.SearchPath();
    }
}
