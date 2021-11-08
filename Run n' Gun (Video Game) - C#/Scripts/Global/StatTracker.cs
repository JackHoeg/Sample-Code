using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class StatTracker : MonoBehaviour
{
    public Slider healthSlider;
    public CharacterSettings playerSettings;

    public static bool getHealthBack = true; //Gives player health when enemy is killed

    private static float _playerHealth;
    public static float PlayerHealth
    {
        get => _playerHealth;
        set
        {
            _playerHealth = value;
            onSetHealth?.Invoke();
        }
    }

    //public static float PlayerHealth;
    private static int enemyCount;
    public static int EnemyCount
    {
        get => enemyCount;
        set
        {
            enemyCount = value;
            onSetEnemyCount?.Invoke();
        }
    }

    private static int enemiesKilled;
    public static int EnemiesKilled
    {
        get => enemiesKilled;
        set
        {
            enemiesKilled = value;
            onSetEnemiesKilled?.Invoke();
        }
    }
    
    private static int keysCollected;
    public static int KeysCollected
    {
        get => keysCollected;
        set
        {
            keysCollected = value;
            onSetKeysCollected?.Invoke();
        }
    }
    
    public static float time = 0;
    //public static int originalAmount;//original amount of anemies

    private void Start()
    {
        EnemiesKilled = 0;
    }

    public static event Action onSetHealth;
    public static event Action onSetEnemyCount;
    public static event Action onSetEnemiesKilled;
    public static event Action onSetKeysCollected;
}
