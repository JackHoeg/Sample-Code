using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

public class ExitDoor : MonoBehaviour
{
    public int keysRequired;
    public int enemiesRequired;
    public SpriteRenderer sprite;
    public BoxCollider2D doorCollider;
    private static bool _unlocked = false;
    public static bool unlocked
    {
        get => _unlocked;
        set
        {
            _unlocked = value;
            if (_unlocked) onUnlock?.Invoke();
        }
    }

    public static event Action onUnlock;
    
    // Start is called before the first frame update
    void Start()
    {
        StatTracker.onSetEnemiesKilled += checkRequirements;
        StatTracker.onSetKeysCollected += checkRequirements;
        
        if (enemiesRequired == 0 && keysRequired == 0)
            unlockDoor();
    }

    private void checkRequirements()
    {
        if(StatTracker.EnemiesKilled >= enemiesRequired && keysRequired <= StatTracker.KeysCollected)
        {
            unlockDoor();
        }
    }

    private void OnTriggerEnter2D(Collider2D collision)
    {
        if(collision.gameObject.CompareTag("Player"))
        {
            LevelComplete.currentScene = SceneManager.GetActiveScene().buildIndex;
            SceneManager.LoadScene("Level Complete");
        }
    }

    private void unlockDoor()
    {
        if (StatTracker.PlayerHealth <= 0f) return;
        AudioManager.audioManager.Play("DoorUnlocked");
        unlocked = true;
        doorCollider.isTrigger = true;
        sprite.color = UnityEngine.Color.green;
        StatTracker.onSetEnemiesKilled -= checkRequirements;
        StatTracker.onSetKeysCollected -= checkRequirements;
    }
    
    private void OnDestroy()
    {
        if (!_unlocked)
        {
            StatTracker.onSetEnemiesKilled -= checkRequirements;
            StatTracker.onSetKeysCollected -= checkRequirements;
        }
        unlocked = false;
    }
}
