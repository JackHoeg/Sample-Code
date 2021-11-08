using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class key : MonoBehaviour
{

    private void OnTriggerEnter2D(Collider2D collision)
    {
        if (collision.gameObject.CompareTag("Player"))
        {
            StatTracker.KeysCollected += 1;
            AudioManager.audioManager.Play("Key");
            Destroy(gameObject);
        }

    }
}
