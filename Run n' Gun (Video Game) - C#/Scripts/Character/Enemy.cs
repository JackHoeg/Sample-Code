using System;
using System.Collections;
using System.Collections.Generic;
using Pathfinding;
using UnityEngine;
using Random = UnityEngine.Random;

public class Enemy : Character
{
    public float healthReturn; //how much health is given back to the player
    private bool hasGun;
    private AudioSource hitSound;

    protected override void Awake()
    {
        base.Awake();
        countEnemy();
    }

    // Start is called before the first frame update
    void Start()
    {
        InitializeCharacterAttributes();
        gun = GetComponentInChildren<Weapon>();
        //TODO: we should probably just give all enemies guns
        hasGun = gun != null;
        assign = () => hasGun = true;
        if (hasGun) gun.transform.position = transform.TransformPoint(characterSettings.gunLocation);
        int soundChoice = Random.Range(0, 2);
        hitSound = AudioManager.audioManager.Request3DSource(gameObject, soundChoice == 1 ? "Hit1" : "Hit2");
    }

    public void Aim(Vector2 target)
    {
        if (hasGun) gun.Aim(target);
    }

    public void Fire()
    {
        if (hasGun) gun.Fire();
    }

    public float GetAtkRng()
    {
        return gun.stats.attackRange;
    }

    public void ResetAim()
    {
        if (hasGun) Helper.LookAt2D(gun.transform, transform.position + 2f * transform.up);
    }
    
    public override void TakeDamage(BulletImpact bi)
    {
        base.TakeDamage(bi);
        //AudioManager.audioManager.PlayAtPoint("Hitmarker", transform.position);
        hitSound.Play();
    }

    //Destroys this game object
    protected override void Kill()
    {
        if (isKilled) return;
        isKilled = true;
        
        StatTracker.EnemiesKilled += 1;
        StatTracker.EnemyCount -= 1;
        
        AudioManager.audioManager.Play("Shatter");
        AudioManager.audioManager.Play("Sizzle");
        if (StatTracker.getHealthBack)
        {
            FindObjectOfType<Player>()?.addHealth(healthReturn);
        }
        DiscardWeapon();
        
        GetComponent<MaterialInstance>().PlayAnim();
        GetComponent<EnemyAI>().enabled = false;
        GetComponent<AIPath>().canMove = false;
        gameObject.tag = "Untagged";
    }

    private void countEnemy()
    {
        StatTracker.EnemyCount += 1;
    }

    private void OnDestroy()
    {
        DifficultySettings.onChangeDifficulty -= UpdateDifficulty;
    }
}