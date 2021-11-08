using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Item : MonoBehaviour
{
    public bool hasLife = true;
    public float lifeTime = 20f; //defines when length until timeout
    public GameObject prefab;
    private bool active = true;

    private void Awake()
    {
        if (prefab != null)
            GetComponent<SpriteRenderer>().color = prefab.GetComponent<Weapon>().stats.color;
    }

    private void Start()
    {
        if (hasLife)
            Invoke(nameof(Destruct), lifeTime);
    }
    
    private void Destruct()
    {
        Destroy(gameObject);
    }

    //assumes only characters can trigger (guaranteed in project settings)
    private void OnTriggerEnter2D(Collider2D other)
    {
        CancelInvoke();
        if (active && other.GetComponent<Character>().EquipWeapon(prefab))
        {
            active = false;
            Destroy(gameObject);
        }
    }

    private void OnTriggerExit2D(Collider2D other)
    {
        Start();
    }
}
