using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class cageDoor : MonoBehaviour
{
    private Animator anim;
    private readonly int openHash = Animator.StringToHash("CageDoorOpen");

    public bool isAnimated;
    
    // Start is called before the first frame update
    void Start()
    {
        if (isAnimated)
        {
            anim = GetComponent<Animator>();
            if (anim == null)
                Debug.LogError("ERROR ANIM IS NULL IN CAGE DOOR");
            ExitDoor.onUnlock += OpenDoor;
        }
        else
            ExitDoor.onUnlock += Destruct;
    }

    void OpenDoor()
    {
        anim.Play(openHash);
    }

    void Destruct()
    {
        Destroy(gameObject);
    }

    private void OnDestroy()
    {
        if (isAnimated)
            ExitDoor.onUnlock -= OpenDoor;
        else
            ExitDoor.onUnlock -= Destruct;
    }
}
