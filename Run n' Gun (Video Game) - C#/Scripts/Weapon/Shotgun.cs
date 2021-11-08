using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Shotgun : Weapon
{
    public Rigidbody2D bullet;

    public byte buckCount = 5;
    public float spreadAngle = 80f;
    private float angleStep;

    protected override void Start()
    {
        base.Start();
        angleStep = spreadAngle / (buckCount - 1);
    }

    public override void Aim(Vector2 target)
    {
        Helper.LookAt2DSmooth(transform, target, stats.aimSpeed * Time.deltaTime);
    }

    public override void Fire()
    {
        if (!IsReadyToFire()) return;
        
        Vector2 spawnLoc = transform.TransformPoint(stats.bulletSpawn);
        float angle = Vector2.SignedAngle(Vector2.up, transform.up);
        float curAngle = angle + spreadAngle * -0.5f;
        for (byte i = 0; i < buckCount; i++)
        {
            Vector2 dir = Helper.Rotate2D(Vector2.up, curAngle);
            Rigidbody2D bulletInstance = Instantiate(bullet, spawnLoc, Quaternion.identity);
            bulletInstance.velocity = dir * stats.baseBulletSpeed;
            curAngle += angleStep;
        }

        nextBulletReady = Time.time + stats.baseFireRate;
        
        flashAnim.Play(flashHash);
        fireSource.Play();
    }
}
