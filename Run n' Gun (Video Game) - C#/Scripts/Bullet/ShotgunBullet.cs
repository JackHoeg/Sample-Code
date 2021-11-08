using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ShotgunBullet : Bullet
{
    private Vector2 startingLocation;
    // modifies damage based on distance traveled
    // Range [0.1, inf] // Lower increases damage dealt
    public float damageLoss = 1f;
    //prevents point-blank shots from ridiculous damage
    private const float MINDist = 0.9f;
    
    // Start is called before the first frame update
    protected override void Start()
    {
        startingLocation = transform.position;
        base.Start();
    }

    protected override void OnCollisionEnter2D(Collision2D collision)
    {
        float dist = Vector2.Distance(collision.GetContact(0).point, startingLocation);
        if (dist >= MINDist) bi.damage /= dist * damageLoss;
        else bi.damage /= MINDist * damageLoss;

        base.OnCollisionEnter2D(collision);
    }
}
