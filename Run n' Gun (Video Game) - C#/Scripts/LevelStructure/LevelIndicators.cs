using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class LevelIndicators : MonoBehaviour
{
    private Text cleared;
    private Text unlocked;

    void Start()
    {
        unlocked = GameObject.Find("Unlocked").GetComponent<Text>();
        cleared = GameObject.Find("Cleared").GetComponent<Text>();
        StatTracker.onSetEnemyCount += checkConditions;
        ExitDoor.onUnlock += unlockedDoor;
    }

    private void checkConditions() //Checks level conditions and activates canvas elements accordingly
    {
        if(StatTracker.EnemyCount == 0)
        {
            cleared.enabled = true;
            StartCoroutine(disableCleared());
        }
    }

    private void unlockedDoor()
    {
        unlocked.enabled = true;
        StartCoroutine(disableUnlocked());
    }

    IEnumerator disableUnlocked()
    {
        yield return new WaitForSeconds(2);
        unlocked.enabled = false;
    }

    
    IEnumerator disableCleared()
    {
        yield return new WaitForSeconds(2);
        cleared.enabled = false;
    }

    private void OnDestroy()
    {
        StopAllCoroutines();
        StatTracker.onSetEnemyCount -= checkConditions;
        ExitDoor.onUnlock -= unlockedDoor;
    }
}
