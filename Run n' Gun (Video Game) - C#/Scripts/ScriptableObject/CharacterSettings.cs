using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[CreateAssetMenu(fileName = "CharacterSettings", menuName = "Settings/Character")]
public class CharacterSettings : ScriptableObject
{
    public Vector2 gunLocation; //stores local coordinates
    public float maxHealth;
}
