using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Bullet : MonoBehaviour
{
    // TODO: Should this be set by Weapon?
    public float bulletDamage;
    protected BulletImpact bi;

    protected virtual void Start()
    {
        bi.damage = bulletDamage;
    }
    
    //collision destroys the bullet
    protected virtual void OnCollisionEnter2D(Collision2D collision)
    {
        bi.col = collision;
        
        IDamageable<BulletImpact> damageable = collision.collider.GetComponent<IDamageable<BulletImpact>>();
        damageable?.TakeDamage(bi);

        Destroy(gameObject);
    }

    //off-screen bullets are destroyed
    //this may not be great in the long run
   /* private void OnBecameInvisible()
    {
        Destroy(gameObject);
    }*/
}
