using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Object = UnityEngine.Object;

public class Obstacle : MonoBehaviour, IDamageable<BulletImpact>
{
    public GameObject damageEffect;

    public void TakeDamage(BulletImpact bi)
    {
        Vector2 impactPoint = bi.col.GetContact(0).point;
        AudioManager.audioManager.PlayAtPoint("Wall1", impactPoint);
        float angle = Vector2.SignedAngle(Vector2.up, bi.col.relativeVelocity);
        Quaternion rot = Quaternion.Euler(0f, 0f, angle);
        Instantiate(damageEffect, impactPoint, rot);
    }
}
