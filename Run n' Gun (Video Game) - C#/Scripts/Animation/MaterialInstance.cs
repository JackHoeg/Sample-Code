using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MaterialInstance : MonoBehaviour
{
    private Animator anim;
    private int materialEffect;

    public string effectName;
    
    // Start is called before the first frame update
    void Start()
    {
        anim = GetComponent<Animator>();
        materialEffect = Animator.StringToHash(effectName);
    }

    public void PlayAnim()
    {
        Material mat = GetComponent<SpriteRenderer>().material;
        anim.Play(materialEffect);
    }
}
