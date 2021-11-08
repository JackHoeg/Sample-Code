using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class HealthBar : MonoBehaviour
{
    public Slider healthSlider;
    public Slider borderSlider;
    public CharacterSettings playerSettings;
    public Gradient gradient;
    public Image fill;

    void Start()
    {
        StatTracker.onSetHealth += SetHealth;
        SetColor();
    }

    public void SetHealth()
    {
        healthSlider.value = StatTracker.PlayerHealth / playerSettings.maxHealth;
        borderSlider.value = healthSlider.value - 1f;
        SetColor();
    }

    private void SetColor()
    {
        Color.RGBToHSV(gradient.Evaluate(healthSlider.normalizedValue), out var hue, out _, out _);
        fill.color = Color.HSVToRGB(hue, 1f, 1f);
    }

    private void OnDestroy()
    {
        StatTracker.onSetHealth -= SetHealth;
    }
}
