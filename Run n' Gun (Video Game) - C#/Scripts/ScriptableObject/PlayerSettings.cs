using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[CreateAssetMenu (fileName = "PlayerSettings", menuName = "Settings/Player")]
public class PlayerSettings : ScriptableObject
{
    //movement
    public float maxSpeed;
    public float minSpeed;
    public float rotSmooth;

    //speed setting
    public float outerRadius;
    public float innerRadius;

    //threshold to stop updating character rotation
    public float minMouse;

    //on collision with enemy
    public float enemyCollideDamage;
}
