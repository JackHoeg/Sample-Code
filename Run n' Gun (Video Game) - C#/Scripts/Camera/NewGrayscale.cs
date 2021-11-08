using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

public class NewGrayscale : MonoBehaviour
{
    private Volume vlm;

    // Start is called before the first frame update
    void Start()
    {
        vlm = GetComponent<Volume>();
        if (vlm == null) Debug.LogError("Grayscale must have Volume");
        else vlm.weight = 0f;
        TimeHandler.onRealTime += FullColor;
        TimeHandler.onSlowTime += FullGray;
        TimeHandler.onRefreshTime += FadeGray;
    }

    void FadeGray()
    {
        if (TimeHandler.timeMode == TimeMode.EaseIn)
        {
            vlm.weight = TimeHandler.transitionProgress;
        } else if (TimeHandler.timeMode == TimeMode.EaseOut)
        {
            vlm.weight = 1f - TimeHandler.transitionProgress;
        }
    }

    void FullGray()
    {
        vlm.weight = 1f;
    }

    void FullColor()
    {
        vlm.weight = 0f;
    }

    private void OnDestroy()
    {
        TimeHandler.onRealTime -= FullColor;
        TimeHandler.onSlowTime -= FullGray;
        TimeHandler.onRefreshTime -= FadeGray;
    }
}
