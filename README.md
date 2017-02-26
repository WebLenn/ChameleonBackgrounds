ChameleonBackgrounds
===================
A jQuery library to dynamically load background elements.
See live demo's at http://chameleonbackgrounds.com

------------
I essentially created this plugin to **withhold large background image files from the initial load**.
This would not only **improve loading times** but also meant that we could show the background image when it's actually fully loaded.
Therefore I created a simple overlay that creates a fadeIn effect by using the **CSS transition-duration** property.

----------


Basic Usage
-------------

See the snippets below for basic usage, use type "single" for a single background image and type "slider" for a slideshow.


#### <i class="icon-code"></i>Type Single
```
<script>
  var options = {
      element: 'body',
      type: 'single',
      src: './img/chameleon.jpg',
      overlayColor: '#0f1e25',
      overlayImage: './img/transparent-tile.png', /* Optional */
      minOverlay: '0.5', /* Optional, Default='0'; */
      transition_duration: 2000
  }

  background = new ChameleonBackgrounds(options);
</script>
```

> **Note:**
> Initializing on element "body" can cause some bugs when there are footer scripts present, read about it in [<i class="icon-folder-open"></i> Additional information](#additionalinformation)


#### <i class="icon-code"></i>Type Slider
```
<script>
  var options = {
      element: '#bckoverlay-sample',
      type: 'slider',
      src: [
        './img/image1.jpg',
        './img/image2.jpg',
      ],
      overlayColor: '#656946',
      overlayImage: './img/transparent-tile.png', /* Optional */
      minOverlay: '0.6', /* Optional, Default='0'; */
      transition_duration: 3000,
      slider_duration: 4000,
      slider_loop: true
  }

  background = new ChameleonBackgrounds(options);
</script>
```

Options
-------------------
#### <i class="icon-file"></i>Type Single
| Option   | Info  | Required   |
| :------- | :---- | :--------: |
| element  | ChameleonBackgrounds will initialize on this element.<br/> **Examples:** "body", "#htmlid", ".htmlclass" |  yes       |
| type     | The type can either be "single" or "slider". |  yes       |
| src      | The image source, on type "single" this has to be a string to the path/url of the image. |  yes       |
| overlayColor | The overlay color for the background loader, can be in HEX,RGBA or HSLA.<br /> **Examples:** "#656946", "rgb(101, 105, 70)"  |  yes       |
| overlayImage | The overlay background(pattern) for the background loader, completely optional but gives great effect combined with a transparent pattern! |  no       |
| minOverlay   | The minimum overlay value, is used to prevent the overlay from completely fading out combined with the overlayColor and overlayImage this can create amazing effects! Optional Default=0  |  no   |
| transition_duration   | The transition duration, the time it takes for the overlay to fadeout, serve value in miliseconds!  |  yes       |

#### <i class="icon-file"></i>Type Slider
| Option   | Info  | Required   |
| :------- | :---- | :--------: |
| element  | ChameleonBackgrounds will initialize on this element.<br/> **Examples:** "body", "#htmlid", ".htmlclass" |  yes       |
| type     | The type can either be "single" or "slider". |  yes       |
| src      | The image source, on type "slider" this has to be an array with paths/urls to the images. |  yes       |
| overlayColor | The overlay color for the background loader, can be in HEX,RGBA or HSLA.<br /> **Examples:** "#656946", "rgb(101, 105, 70)"  |  yes       |
| overlayImage | The overlay background(pattern) for the background loader, completely optional but gives great effect combined with a transparent pattern! |  no       |
| minOverlay   | The minimum overlay value, is used to prevent the overlay from completely fading out combined with the overlayColor and overlayImage this can create amazing effects! Optional Default=0  |  no   |
| transition_duration   | The transition duration, the time it takes for the overlay to fadeout, serve value in miliseconds!  |  yes       |
| slider_duration  | The slider duration, the time the image is shown count starts when the transition duration is past, serve value in miliseconds!  |  yes   |
| slider_loop| Slider loop, set to true if you want the slider to auto restart on finish.  |  yes       |

<a name="additionalinformation"></a>Additional information
-------------------
> **Element body:**
> When ChameleonBackgrounds gets initialized it'll add 2 new elements to create the fadein effect, 1 of these elements is used to wrap around the existing html.
> If it gets initialized on the body element it'll try to wrap all html in the <body> into a new html element, if the body contains footerscripts they'll get moved and therefore recalled.
> Calling a script twice can cause bugs therefore when initializing ChameleonBackgrounds on the &lt;body&gt; use on of the methods below to load other footer scripts.

>#### <i class="icon-code"></i> Method1

>```
><script src="inc/js/jquery-3.1.1.min.js"></script>
><script src="inc/js/chameleonbackgrounds.js"></script>
><script>
>	background = new ChameleonBackgrounds();
></script>
><script src="inc/js/your-footerscript.js"></script>
>```
>Inside your-footerscript.js wrap all code in an if statement like the snippet below
>```
><script>
>	if(background.bodyReplaced){
>		/* Your script here */
>	}
></script>
>```

>#### <i class="icon-code"></i> Method2
>```
><script src="inc/js/jquery-3.1.1.min.js"></script>
><script src="inc/js/chameleonbackgrounds.js"></script>
><script>
>	background = new ChameleonBackgrounds();
>	if(background.bodyReplaced){
>		/* Use getScript to load your JS file */
>		$.getScript('inc/js/your-footerscript.js');
>	}
></script>
>```

<br />

> **Use transparent patterns as overlayImage**
> We love to use transparent patterns as overlayImages, these transparent patterns combined with the overlayColor and minOverlay can create amazing effects.
> Take our site for example, allmost every images has diffrent colors but because of the green overlayColor in combination with the minOverlay and overlayImages it looks like every image is part of the design.
>
> Looking for some awesome transparent patterns ?
> We love the patterns on https://.transparenttextures.com
