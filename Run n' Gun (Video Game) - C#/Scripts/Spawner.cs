using System.Collections;
using System.Collections.Generic;
using Pathfinding;
using UnityEngine;

public class Spawner : MonoBehaviour
{
    public GameObject spawnObject;

    // Update is called once per frame
    void Update()
    {
        controls();
    }

    private void controls()
    {
        if (Input.GetKeyDown(KeyCode.S))
        {
            spawnEnemy();
        }
    }
    private void spawnEnemy()
    {
        var grid = AstarPath.active.data.gridGraph;
        GraphNode rand = grid.nodes[Random.Range(0, grid.nodes.Length)];
        while (!rand.Walkable)
        {
            //could be infinite loop? won't be. But could be...
            rand = grid.nodes[Random.Range(0, grid.nodes.Length)];
        }
        
        Vector3 spawnPosition = (Vector3) rand.position;
        Instantiate(spawnObject, spawnPosition,  Quaternion.identity);
        AudioManager.audioManager.Play("SpawnEnemy");
    }
}
