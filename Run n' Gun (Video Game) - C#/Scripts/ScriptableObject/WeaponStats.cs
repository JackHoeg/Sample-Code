using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public enum WeaponType : byte
{
    Handgun,
    MachineGun,
    Shotgun
}

public enum FireMode : byte //used to identify firing mode
{
    Semi,
    Auto,
    Charge
};

[CreateAssetMenu(fileName = "WeaponStats", menuName = "Stats/Weapon")]
public class WeaponStats : ScriptableObject
{
    public WeaponType type;
    public GameObject prefab; // stores the prefab that the gun
    
    public float baseFireRate; //measured in time between shots
    public float baseBulletSpeed; //velocity of bullet
    public float aimSpeed; //0 is fastest
    public float attackRange; //squared distance
    public FireMode fireMode;

    public Vector2 bulletSpawn; //local coordinates
    public Color color;
}
