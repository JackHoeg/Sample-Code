using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class BTEffect : MonoBehaviour
{
    private Animator anim;
    private readonly int enterHash = Animator.StringToHash("BTUse");
    private readonly int rechargeHash = Animator.StringToHash("BTRecharge");
    
    // Start is called before the first frame update
    void Start()
    {
        anim = GetComponent<Animator>();
        TimeHandler.onRecharge += RechargeBT;
        TimeHandler.onEaseIn += EnterBT;
        TimeHandler.onEaseOut += ExitBT;
    }

    void EnterBT()
    {
        anim.updateMode = AnimatorUpdateMode.UnscaledTime;
        anim.Play(enterHash);
        AudioManager.audioManager.Play("BTEnter");
    }
    
    void RechargeBT()
    {
        anim.updateMode = AnimatorUpdateMode.Normal;
        anim.Play(rechargeHash);
        AudioManager.audioManager.Play("BTRecharge");
    }

    void ExitBT()
    {
        AudioManager.audioManager.Play("BTExit");
    }

    private void OnDestroy()
    {
        TimeHandler.onRecharge -= RechargeBT;
        TimeHandler.onEaseIn -= EnterBT;
        TimeHandler.onEaseOut -= ExitBT;
    }
}
