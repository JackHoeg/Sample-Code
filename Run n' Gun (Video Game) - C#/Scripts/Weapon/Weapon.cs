using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public abstract class Weapon : MonoBehaviour
{
    //stores all parameters
    [HideInInspector]
    public WeaponStats stats;
    public WeaponStats easyStats;
    public WeaponStats normalStats;
    public WeaponStats hardStats;
    public Animator flashAnim;
    public string fireSound;
    
    protected float nextBulletReady = -1f;
    protected readonly int flashHash = Animator.StringToHash("Flash");
    protected AudioSource fireSource;

    private void Awake()
    {
        UpdateDifficulty();
        DifficultySettings.onChangeDifficulty += UpdateDifficulty;
    }

    protected virtual void Start()
    {
        fireSource = transform.parent.CompareTag("Player") ? 
            AudioManager.audioManager.RequestSource(gameObject, fireSound) : 
            AudioManager.audioManager.Request3DSource(gameObject, fireSound);
    }

    // Generic method to fire any weapon
    public abstract void Fire();

    //returns true if fireRate allows another shot
    protected virtual bool IsReadyToFire()
    {
        return Time.time >= nextBulletReady;
    }
    
    // Points any weapon at target
    public virtual void Aim(Vector2 target)
    {
        Helper.LookAt2D(transform, target);
    }

    private void UpdateDifficulty()
    {
        switch (DifficultySettings.DifficultyLevel)
        {
            default:
            case Difficulty.Normal:
                stats = normalStats;
                break;
            case Difficulty.Easy:
                stats = easyStats;
                break;
            case Difficulty.Hard:
                stats = hardStats;
                break;
        }
    }

    private void OnDestroy()
    {
        DifficultySettings.onChangeDifficulty -= UpdateDifficulty;
    }
}
