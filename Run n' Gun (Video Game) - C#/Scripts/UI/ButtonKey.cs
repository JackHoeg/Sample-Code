using System;
using System.Collections;
using System.Collections.Generic;
using System.Runtime.InteropServices.ComTypes;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class ButtonKey : MonoBehaviour, IPointerEnterHandler, IPointerExitHandler
{
    private Button myButton;
    private bool isHighlighted;

    public string inputName;
    public bool allowEsc;
    private bool inputDown;
    
    private void Awake()
    {
        myButton = GetComponent<Button>();
        if (myButton == null)
            Debug.LogError("GameObject" + gameObject.name + " must have Button Component");
        myButton.onClick.AddListener(PlayClickSound);
    }

    private void OnEnable()
    {
        inputDown = false;
    }

    private void Update()
    {
        if (!isHighlighted) return;
        if (Input.GetButtonDown(inputName))
            inputDown = true;
        if ((inputDown && Input.GetButtonUp(inputName)) || (allowEsc && Input.GetKeyDown(KeyCode.Escape)))
            myButton.onClick.Invoke();
    }

    public void OnPointerEnter(PointerEventData eventData)
    {
        isHighlighted = true;
        AudioManager.audioManager.Play("UIOver");
    }

    public void OnPointerExit(PointerEventData eventData)
    {
        isHighlighted = false;
        inputDown = false;
    }

    private void OnDisable()
    {
        isHighlighted = false;
    }

    private void PlayClickSound()
    {
        AudioManager.audioManager.Play("UIClick");
    }
}
