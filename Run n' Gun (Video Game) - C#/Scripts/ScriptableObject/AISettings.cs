using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[CreateAssetMenu(fileName = "AISettings", menuName = "Settings/AI")]
public class AISettings : ScriptableObject
{
    public float targetRange;
    public float chanceToFire;
    public float searchTime;
    public int maxRayCol;
}
