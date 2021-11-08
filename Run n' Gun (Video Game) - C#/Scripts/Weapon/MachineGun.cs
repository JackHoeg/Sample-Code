using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/*
 * TODO: This class is literally a combo of Handgun and Shotgun
 *     There must be a better way of doing this
 */
public class MachineGun : Weapon
{
    public Rigidbody2D bullet;

    public override void Aim(Vector2 target)
    {
        Helper.LookAt2DSmooth(transform, target, stats.aimSpeed * Time.deltaTime);
    }
    
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
