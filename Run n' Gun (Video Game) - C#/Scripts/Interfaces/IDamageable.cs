using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public struct BulletImpact
{
    public float damage;
    public Collision2D col;
}

public interface IDamageable<BulletImpact>
{
    void TakeDamage(BulletImpact bi);
}
