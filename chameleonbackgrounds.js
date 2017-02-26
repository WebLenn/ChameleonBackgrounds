/*
    _____ _                          _
   / ____| |                        | |
  | |    | |__   __ _ _ __ ___   ___| | ___  ___  _ __
  | |    | '_ \ / _` | '_ ` _ \ / _ \ |/ _ \/ _ \| '_ \
  | |____| | | | (_| | | | | | |  __/ |  __/ (_) | | | |
  \_____|_| |_|\__,_|_| |_| |_|\___|_|\___|\___/|_| |_|_
  |  _ \           | |                                 | |
  | |_) | __ _  ___| | ____ _ _ __ ___  _   _ _ __   __| |___
  |  _ < / _` |/ __| |/ / _` | '__/ _ \| | | | '_ \ / _` / __|
  | |_) | (_| | (__|   < (_| | | | (_) | |_| | | | | (_| \__ \
  |____/ \__,_|\___|_|\_\__, |_|  \___/ \__,_|_| |_|\__,_|___/
                         __/ |
                        |___/
  Author: Lennart van Ballegoij (https://webverder.nl)
  Repo: https://github.com/WebVerder/ChameleonBackgrounds
  Version: 1.0.0
  
*/
var ChameleonBackgrounds = function(options) {
  if(options){
    this.options = options;
  } else {
    this.options = this.getDefaults();
  }
  this.bodyReplaced = false;
  this.elementAddon = 'body';

  var element = $(this.options.element);
  if(!element.is('body')){
    this.elementAddon = this.randomElementName();
  }

  this.createBackgroundLoader();
};

ChameleonBackgrounds.prototype = {
  getDefaults: function() {
    var defaults = {
        element: 'body',
        type: 'single',
        src: 'http://placehold.it/1920x1080',
        overlayColor: '#0f1e25',
        transition_duration: 2000,
        slider_duration: 8000,
        slider_loop: false
    }

    return defaults;
  },

  randomElementName: function() {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz";

    for( var i=0; i < 3; i++ ){
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
  },

  createBackgroundLoader: function() {
    var thisClass = this;
    var element = $(this.options.element);
        bodyContent = element.html();
        duration = this.options.transition_duration / 1000; //ms to seconds
        elementaddon = this.elementAddon;
        overlayImage = this.options.overlayImage;

    if(overlayImage){
      overlayImage = 'url('+this.options.overlayImage+')';
    }

    if(element.is('body')){
      //Overlay position is fixed on body to ensure overlay is present when scrolling down!
      position = 'fixed';
    } else {
      position = 'absolute';
    }

    loaderStyles = '<style> '+ this.options.element +'{ position: relative; } #cbg_inner_'+ elementaddon +'{ z-index: 2; position: relative; } .cbg-loader.'+ elementaddon +'{ height: 100%; width: 100%; position: '+ position +'; background-image:'+ overlayImage +'; background-color: '+ this.options.overlayColor +'; opacity: 1; z-index: 1; transition-duration: '+ duration +'s; -webkit-transition-duration: '+ duration +'s; /* Safari */ top: 0; left: 0; } </style>';

    if(!$(this.options.element+' .cbg-loader').length){
      element.html(loaderStyles +'<div id="cbg_inner_'+ elementaddon +'">'+ bodyContent +'</div><div class="cbg-loader '+ elementaddon +'"></div>');
      if(!element.is('body')){
        $(window).on('load', function(){
          thisClass.retrieveBackground();
        });
      }
      this.bodyReplaced = true;
    } else {
      //Script got placed into #cbg_inner therefore got reloaded, only calling the actual Background load when #cbg_inner exists!
      $(window).on('load', function(){
        thisClass.retrieveBackground();
      });
    }
  },

  loadBackground: function(src) {
    if(src){
      var img_src = src;
    } else {
      var img_src = this.options.src;
    }

    var thisClass = this;
    var element = this.options.element;
    var minOverlay = this.options.minOverlay;
    var type = this.options.type;
    var elementaddon = this.elementAddon;

    if(!minOverlay){
      minOverlay = '0';
    }

    $('<img/>').attr('src', img_src).on("load", function() {
      $(this).remove(); // prevent memory leaks
      $(element).css('background-image', 'url('+ img_src +')');
      $(element+' .cbg-loader.'+elementaddon).css('opacity', minOverlay);

      //If type is slider callback the backgroundslider when first slide is fullyloaded!
      if (type == 'slider') {
        thisClass.loadBackgroundSlider(1);
      }
    });
  },

  reloadBackground: function(src) {
    if(src){
      var img_src = src;
    } else {
      var img_src = this.options.src;
    }

    var element = this.options.element;
    var minOverlay = this.options.minOverlay;
    var elementaddon = this.elementAddon;

    if(!minOverlay){
      minOverlay = '0';
    }

    $(element+' .cbg-loader').css('opacity', '1');

    function loadSource(){
      $('<img/>').attr('src', img_src).on("load", function() {
        $(this).remove(); // prevent memory leaks
        $(element).css('background-image', 'url('+ img_src +')');
        $(element+' .cbg-loader.'+elementaddon).css('opacity', minOverlay);
      });
    }

    setTimeout(function(){
      loadSource();
    }, this.options.transition_duration);

  },

  loadBackgroundSlider: function(loop) {
    var slider_src = this.options.src;
    var slider_duration = this.options.slider_duration + (this.options.transition_duration * 2);
    var reloop_slider = this.options.slider_loop;
    var thisClass = this;
    var reloop = false;

    if(loop == 0){
      if(!reloop){
        this.loadBackground(slider_src[loop]);
        loop++;
      }
    } else {
      setInterval(function(){
        var reloop = false;

        if(loop === 'reloop'){
          reloop = true;
          loop = 0;
        }

        var src = slider_src[loop];

        if(loop == 0){
          if(reloop){
            thisClass.reloadBackground(src);
          }
        } else {
          thisClass.reloadBackground(src);
        }
        loop++;

        //Slider is done, restart it
        if(loop == slider_src.length){
          if(reloop_slider){
            loop = 'reloop';
          } else {
            clearInterval(run);
          }
        }
      }, slider_duration);
    }
  },

  retrieveBackground: function() {
    var type = this.options.type;

    if(type == 'single'){
      this.loadBackground();
    } else if (type == 'slider') {
      this.loadBackgroundSlider(0);
    }
  },

  constructor: ChameleonBackgrounds
};
