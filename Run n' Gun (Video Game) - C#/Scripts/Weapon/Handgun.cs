using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Handgun : Weapon
{
    public Rigidbody2D bullet;

    public override void Fire()
    {
        if (!IsReadyToFire()) return;

        //Creates and fires bullet
        Vector2 spawnLoc = transform.TransformPoint(stats.bulletSpawn);
        object bulletObject = Instantiate(bullet, spawnLoc, Quaternion.identity);
        Rigidbody2D bulletInstance = bulletObject as Rigidbody2D;
        bulletInstance.velocity = transform.up * stats.baseBulletSpeed;
        nextBulletReady = Time.time + stats.baseFireRate;
        
        flashAnim.Play(flashHash);
        fireSource.Play();
    }
}
