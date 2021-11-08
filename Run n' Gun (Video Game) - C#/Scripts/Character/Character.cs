using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/*
 * Contains methods that work player and enemies
 * Makes collision processing more efficient (i.e. damage, equip)
 */
public abstract class Character : MonoBehaviour, IDamageable<BulletImpact>
{
    [HideInInspector]
    public CharacterSettings characterSettings;
    public CharacterSettings easyCharacter;
    public CharacterSettings normalCharacter;
    public CharacterSettings hardCharacter;
    
    protected float health;
    
    protected Weapon gun;
    public GameObject dropped; //what to drop
    private float equipTime;

    public GameObject damageEffect;

    //stores the appropriate firemode select function
    protected delegate void AssignFMode();
    protected AssignFMode assign;
    
    protected bool isKilled;

    protected virtual void Awake()
    {
        DifficultySettings.onChangeDifficulty += UpdateDifficulty;
    }

    //initialize this character's attributes
    protected void InitializeCharacterAttributes()
    {
        switch (DifficultySettings.DifficultyLevel)
        {
            default:
            case Difficulty.Normal:
                characterSettings = normalCharacter;
                break;
            case Difficulty.Easy:
                characterSettings = easyCharacter;
                break;
            case Difficulty.Hard:
                characterSettings = hardCharacter;
                break;
        }
        
        health = characterSettings.maxHealth;
        //for keep track of player stats for UI elements and easy access
        if (gameObject.CompareTag("Player"))
        {
            StatTracker.PlayerHealth = health;
        }
        
    }

    //==Health and Damage Methods==//

    //Called when health <= 0
    protected abstract void Kill();
    
    //called by the bullet
    //the bullet can specify the damage dealt
    public virtual void TakeDamage(BulletImpact bi)
    {
        
        health -= bi.damage;
        if (health <= 0f)
        {
            Kill();
            bi.col.rigidbody.velocity += 0.4f * bi.col.otherRigidbody.velocity;
        }
        float angle = Vector2.SignedAngle(Vector2.up, bi.col.relativeVelocity);
        Quaternion rot = Quaternion.Euler(0f, 0f, angle);
        Instantiate(damageEffect, bi.col.GetContact(0).point, rot, transform);
    }
    
    //==Item Interaction Methods==//
    
    //replaces current gun
    public bool EquipWeapon(GameObject gunPrefab)
    {
        if (isKilled || Time.time < equipTime)
            return false;
        equipTime = Time.time + 1f;

        Quaternion rotation;
        if (gun != null)
        {
            rotation = gun.transform.rotation;
            DiscardWeapon();
        }
        else
            rotation = transform.rotation;
        
        GameObject newGun = Instantiate(gunPrefab, transform.TransformPoint(characterSettings.gunLocation), rotation, transform);
        gun = newGun.GetComponent<Weapon>();
        assign?.Invoke();
        if (gameObject.CompareTag("Player"))
            AudioManager.audioManager.Play("EquipWeapon");
        return true;
    }

    //destroys current gun and instantiates item
    protected void DiscardWeapon()
    {
        if (gun.stats.type != WeaponType.Handgun)
        {
            GameObject drop = Instantiate(dropped, transform.position, Quaternion.identity);
            drop.GetComponent<Item>().prefab = gun.stats.prefab;
            drop.GetComponent<SpriteRenderer>().color = gun.stats.color;
        }

        Destroy(gun.gameObject);
        gun = null;
    }

    protected void UpdateDifficulty()
    {
        float healthRatio = health / characterSettings.maxHealth;
        switch (DifficultySettings.DifficultyLevel)
        {
            default:
            case Difficulty.Normal:
                characterSettings = normalCharacter;
                break;
            case Difficulty.Easy:
                characterSettings = easyCharacter;
                break;
            case Difficulty.Hard:
                characterSettings = hardCharacter;
                break;
        }

        health = characterSettings.maxHealth * healthRatio;
    }
    
    private void Destruct()
    {
        Destroy(gameObject);
    }

}
