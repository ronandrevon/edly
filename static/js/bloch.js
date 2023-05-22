(function () {
  'use strict';

app.factory('bloch_shared', function(){
  return {graphs:'',graph:'',modes:{}}
});



angular.module('app')
  .controller('BlochCtrl', ['$scope','$rootScope','$log','$http', '$interval','$timeout','bloch_shared', function ($scope,$rootScope,$log,$http,$interval,$timeout,bloch_shared) {

    $rootScope.$on('load_fig1',function(event,data){
        $scope.fig1 = data;
    })
    $rootScope.$on('load_fig2',function(event,data){
        $scope.fig2 = data;
    })

    $scope.initPlotly=false
    /////////////////////////////////
    //// plotly cb
    /////////////////////////////////
    $scope.addRow_tagTable=function(data){
      let h=data.points[0].customdata[1];
      $rootScope.$emit('addRow_tagTable',h);
    }

    $scope.leg_click=function(event){
      var curve_nb=event.curveNumber;

      //special case for the resolution rings
      if ($scope.info.rings.length){
        if ( curve_nb>=$scope.info.rings[0]){
          curve_nb=$scope.info.rings[0];
        }
      }

      //change visibility
      let dat = event.data[curve_nb];
      if (dat.visible==true){
        var visible='legendonly';
      }
      else{
        var visible=true;
      }
      $scope.set_visible(dat.name,curve_nb,visible);
      return false;
    }

    $rootScope.$on('set_visible',function(event,data){
      $scope.set_visible(data.name,data.curve_nb,data.vis)
    })

    $scope.set_visible=function(name,curve_nb,visible){
      Plotly.restyle('fig1', {'visible':visible},[curve_nb]);
      $http.post('set_visible',JSON.stringify({'key':name,'v':visible}))
      .then(function(response){
        // $log.log(response.data);
      });

      if ($scope.info.rings.length>0){
        if ( curve_nb>=$scope.info.rings[0]){
          Plotly.restyle('fig1', {'visible':visible},$scope.info.rings);
          $http.post('set_visible',JSON.stringify({'key':'rings','v':visible}))
          .then(function(response){
            // $log.log(response.data);
          });
        }
      }
    }

    $scope.update_graph=function(){
      if (!$scope.info.modes.single){
        // $log.log($scope.info.graph);
        $rootScope.$emit('update_graph');
      }
    }
    $scope.toggle_mode=function(key){
      $rootScope.$emit('toggle_mode','single')
    }

    $scope.set_max_res_rings = function(){
      // $log.log({'max_res':$scope.info.max_res,'dq_ring':$scope.info.dq_ring})
      $http.post('set_max_res_rings',JSON.stringify({'max_res':$scope.info.max_res,'dq_ring':$scope.info.dq_ring}))
        .then(function(response){
          $scope.fig1 = JSON.parse(response.data.fig);
          $scope.info.rings = response.data.rings;
        });
    }
    $scope.set_max_res=function(){
      $scope.set_max_res_rings();
    }
    $scope.set_ring_spacing=function(){
      $scope.set_max_res_rings();
    }



    //////////////////////////////////////////////////////////////
    //// INIT
    //////////////////////////////////////////////////////////////
    $scope.fig1={};
    $scope.fig2={};
    // $scope.init = function(){
    //   $http.get('init_bloch')
    //     .then(function(response){
    //       $scope.single_mode = $scope.info.modes['single'];
    //       // $scope.info.graph   = $scope.info.graphs[response.data.graph];
    //   })
    // }

    $scope.info=bloch_shared;
    // $scope.init();

}]);











//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
///// BLOCH PANEL
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
angular.module('app')
  .controller('BlochPanelCtrl', ['$scope','$rootScope','$log','$http', '$interval','$timeout','bloch_shared', function ($scope,$rootScope,$log,$http,$interval,$timeout,bloch_shared) {

  ///////////////////////////////////////////////////////////////////
  // Toggles
  ///////////////////////////////////////////////////////////////////
  $scope.set_mode_u=function(key){
    $http.post('set_mode_val',JSON.stringify({'key':key,'val':$scope.info.modes[key]}))
    .then(function(response){
        // $log.log(response.data);
      });
    if (!$scope.info.modes['manual'] && key=='rock' ){
    }
    else{
      // if ($scope.graph==$scope.graphs['rock']){
      //   $scope.graph=$scope.graphs['thick'];
      // }
      $scope.set_available_graphs('rock',false || $scope.exp_rock);
    }
  }

  $scope.toggle_manual_mode=function(){
    $scope.toggle_mode('manual');
    if ($scope.info.modes['manual'] && $scope.info.modes['u']=='rock'){
      $log.log("updating rock")
      $scope.get_rock_sim();
    }
    else{
      $log.log("updating bloch")
      $scope.get_bloch_sim();
    }
  }

  $scope.get_bloch_sim=function(){
    $http.post('get_bloch_sim')
    .then(function(response){
      $scope.bloch.u=response.data.u;
      $rootScope.$emit('load_fig1',JSON.parse(response.data.fig))
    });
  }

  $rootScope.$on('toggle_mode',function(event,key){
      $scope.toggle_mode(key);
  })

  $scope.toggle_mode=function(key){
    $scope.info.modes[key]=!$scope.info.modes[key];
    // $log.log(key,$scope.info.modes)
    $http.post('set_mode_val',JSON.stringify({'key':key,'val':$scope.info.modes[key]}))
    .then(function(response){
        // $log.log(respo nse.data)
      });
  }

  $scope.set_input=function(key,v){
    $scope.input[key]=false;
    switch(v){
      case 'move':
        $scope.update_theta_phi();
        break;
      case 'rock':
        $scope.get_rock_sim();
        break;
    }
  }




  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Bloch
  ////////////////////////////////////////////////////////////////////////////////////////////////
  $rootScope.$on('update_frame',function(event,frame,init){
      //
      $scope.frame=frame;
      $scope.bloch_solve_reset()
      if (!init){
        $log.log('manual mode : ',$scope.info.modes['manual'])
        if ($scope.info.modes['manual']){
          $log.log('manual mode.update only exp data')
          $scope.update_frame();
        }
        else{
          $log.log('auto mode. resolve for new frame')
          $scope.update_bloch();
        }
      }
  })

  $scope.update_frame=function(){
    $http.post('update_bloch_frame',JSON.stringify({'frame':$scope.frame}))
    .then(function(response){
      $rootScope.$emit('load_fig1',response.data)
    });
  }

  $scope.update_bloch=function(){
    // $log.log($scope.bloch);//['Smax'],$scope.bloch['Nmax'])
    if ($scope.bloch_solve_btn=='Solve'){
        $scope.bloch_solve_set('Preparing');
        // $log.log('solving bloch for frame ',$scope.frame, ' with bloch' , $scope.bloch);
        $http.post('bloch_u',JSON.stringify({'frame':$scope.frame,'bloch':$scope.bloch,'manual_mode':$scope.info.modes['manual']}))
        .then(function(response){
          $scope.load_bloch(response.data);
          // FELIX
          if ($scope.bloch['felix']){
            var interval;
            interval = $interval(function () {
              $http.get('bloch_state')
              .then(function(response) {
                $scope.bloch_solve_set(response.data);
              });
            }, 250);
            $http.post('solve_bloch')
            .then(function(response){
              $log.log('completed');
              $scope.fig1 = response.data;//JSON.parse(response.data.fig);
              $scope.update_graph();
              $scope.bloch_solve_set('Completed');
              $interval.cancel(interval);
            })
            // $interval.cancel(interval);
          }
          // BLOCHWAVE
          else{
            if (response.data.nbeams>1000){
              $log.log('too many beams sorry');
              $scope.bloch_solve_set('Solve');
            }
            else{
              $scope.bloch_solve_set('Solving');
              $http.post('solve_bloch',JSON.stringify())
              .then(function(response){
                $scope.info.rings = response.data.rings;
                // $log.log('rings : ',$scope.info.rings);
                $scope.refl = response.data.refl;
                $scope.add_refl();
                $rootScope.$emit('load_fig1',JSON.parse(response.data.fig))
                $scope.update_graph();
                $scope.bloch_solve_set('Completed');
                $log.log('bloch solve Completed');
              });
            }
          }
        });
        $scope.expand['thick']=true
    }
  };


  $scope.bloch_solve_set=function(state){
    $scope.bloch_solve_btn=state;
    var c = 'red'
    if (state in bloch_colors){
      c = bloch_colors[state]
    }
    $scope.bloch_solve_style={'background-color':c};
  }
  $scope.bloch_solve_reset=function(){
    $scope.bloch_solve_set('Solve');
  }

  $scope.load_bloch = function (data){
    $scope.bloch     = data.bloch;
    $scope.nbeams    = data.nbeams;
    $scope.theta_phi = data.theta_phi.split(',');
    // $log.log($scope.rings)
  }


  $scope.set_u_mode=function(val){
    $scope.info.modes['u']=val;
    $scope.set_mode_u('u');
    $scope.u_style = {'edit':'','move':'','rock':''};
    $scope.u_style[val]={"border-style":'solid'};
    switch (val){
    //   case 'edit':
    //     break;
      case 'move':
        $rootScope.$emit('set_visible',{name:'Sw',curve_nb:2,vis:true})
        break;
      case 'rock':
        // $log.log($scope.rock_state=='done');
        $scope.set_available_graphs('rock',$scope.rock_state=='done');
        break;
    }
  }


  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Rock mode
  ////////////////////////////////////////////////////////////////////////////////////////////////
  $scope.set_rock=function(opt){
    // $log.log(opt);
    $http.post('set_rock_frame',JSON.stringify({'frame':$scope.frame,'opt':opt}))
    .then(function(response){
      $scope.rock = response.data.rock;
      $scope.rock_reset();
    })
  }

  $scope.solve_rock=function(){
    $log.log($scope.solve_rock_btn,$scope.rock_state)
    if ($scope.solve_rock_btn=='Solve rock'){
    // if ($scope.solve_rock_btn[$scope.rock_state]=='Solve rock'){
      $http.post('set_rock',JSON.stringify({'rock':$scope.rock,'bloch':$scope.bloch}))
      .then(function(response){
        $scope.rock = response.data.rock;
        $scope.rock_state='init';
        $scope.solve_rock_btn=$scope.rock_state;
        $scope.rock_style={'background-color':'red'};
        var interval;
        interval = $interval(function () {
          $http.get('rock_state')
          .then(function(response) {
            $scope.rock_state = response.data;
            $scope.solve_rock_btn=$scope.rock_state;
            $log.log($scope.rock_state);
          });
        }, 100);
        $http.post('solve_rock')
        .then(function(response){
          $scope.nrock_beams = response.data.nbeams;
          $scope.rock_style = {'background-color':'green'};
          $scope.rock_state = 'done';
          $scope.solve_rock_btn = 'done';
          $scope.set_available_graphs('rock',true);
          $scope.set_rock_sim(1);
          $log.log('completed');
          $interval.cancel(interval);
          // $scope.rock_state = 'done';
          // $scope.solve_rock_btn = 'done';
        })
      })
      $scope.rock_state = 'done';
      $scope.solve_rock_btn = 'done';
    }
  }


  $scope.update_rock_sim=function(e){
    s=''
    switch (e.keyCode){
      case 37: s='-';break;
      case 39: s='+';break;
      case 38: s='f';break;
      case 40: s='i';break;
    }
    if (s){
      // $log.log(s);
      $scope.set_rock_sim(s);}
  }

  $scope.set_rock_sim=function(s){
    switch (s){
      case 'i':$scope.rock_sim  = 1;break;
      case '-':$scope.rock_sim -= 1;break;
      case '+':$scope.rock_sim += 1;break;
      case 'f':$scope.rock_sim  = 100;break;
    }
    $scope.get_rock_sim();
  }

  $scope.get_rock_sim=function(){
    $http.post('get_rock_sim',JSON.stringify({'sim':Number($scope.rock_sim),'frame':$scope.frame}))
      .then(function(response){
        $rootScope.$emit('load_fig1',JSON.parse(response.data.fig))
        // $scope.fig1 = JSON.parse(response.data.fig);
        $scope.bloch['u'] = response.data.u;
        $scope.rock_sim  = response.data.sim;
        $scope.sim_rock  = $scope.rock_sim;

        $scope.update_graph();
    });
  }
  $scope.all_rock_sim=function(){
    $http.post('overlay_rock')
    .then(function(response){
      $rootScope.$emit('load_fig1',response.data)
      // $scope.fig1 = response.data;
      $scope.sim_rock = 'all';
    });
  }

  $scope.rock_reset=function(){
    $scope.solve_rock_btn='Solve rock';
    // $log.log($scope.rock_state);
    $scope.rock_style={'background-color':'#286090'};
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Rotate mode
  ////////////////////////////////////////////////////////////////////////////////////////////////
  $scope.theta_phi_cb=function(e){
    $scope.bloch_solve_reset()
    var updated = false;
    var theta_phi=[Number($scope.theta_phi[0]),Number($scope.theta_phi[1])];
    $scope.dtheta_phi=Number($scope.dtheta_phi);
    switch (e.keyCode) {
        case 37:
          theta_phi[1]-=$scope.dtheta_phi;
          updated=true;
          break;
        case 38:
          theta_phi[0]+=$scope.dtheta_phi;
          updated=true;
          break;
        case 39:
          theta_phi[1]+=$scope.dtheta_phi;
          updated=true;
          break;
        case 40:
          theta_phi[0]-=$scope.dtheta_phi;
          updated=true;
          break;
        case 34:
          $scope.dtheta_phi*=2;
          break;
        case 33:
          $scope.dtheta_phi/=2;
          break;
        case 8:
          $scope.dtheta_phi=0.1;
          break;
        case 13:
          $scope.update_bloch();
          break;
    }
    if (updated){
      $scope.theta_phi=theta_phi;
      $scope.update_theta_phi();
    }
  }
  $scope.update_theta_phi=function(){
    $scope.theta_phi[0]%=180;
    $scope.theta_phi[1]%=360;
    $http.post('bloch_rotation',JSON.stringify({'theta_phi':$scope.theta_phi}))
      .then(function(response){
        $scope.load_bloch(response.data);
        $rootScope.$emit('load_fig1',JSON.parse(response.data.fig))
      });
  }


  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Thickness
  ////////////////////////////////////////////////////////////////////////////////////////////////
  $scope.update_thickness = function (e) {
    var updated=false;
    switch (e.keyCode) {
        case 37:
          $scope.bloch['thick']-=10*$scope.dthick;
          updated=true;
          break;
        case 38:
          $scope.bloch['thick']+=$scope.dthick;
          updated=true;
          break;
        case 39:
          $scope.bloch['thick']+=10*$scope.dthick;
          updated=true;
          break;
        case 40:
          $scope.bloch['thick']-=$scope.dthick;
          updated=true;
          break;
        case 34:
          $scope.dthick+=1;
          break;
        case 33:
          $scope.dthick-=1;
          break;
        case 8:
          $scope.dthick=5;
          break;
        case 13:
          updated=true;
          break;
    }
    if (updated){
      $http.post('update_thickness',JSON.stringify({'thick':$scope.bloch['thick']}))
      .then(function(response){
        // $scope.fig1 = response.data;
        $rootScope.$emit('load_fig1',response.data)
        if ($scope.info.modes['u']=='rock'){
          $scope.show_rock();
        }
      });
    }
  }




  ////////////////////////////////////////////////////////////////////////////////////////////////
  // misc stuffs
  ////////////////////////////////////////////////////////////////////////////////////////////////
  $scope.toggle_felix=function(){
    $scope.bloch_solve_reset()
  }

  $scope.update_Nmax=function(){
    if ($scope.bloch['gemmi']){
      $scope.bloch['Nmax']=Math.max(1,Math.min(30,Math.ceil($scope.info.cell_diag/$scope.bloch['dmin'])));
      // $log.log($scope.bloch['Nmax']);
    }
    else{
      $scope.bloch['dmin']=Math.max(0.1,Math.min(3,$scope.info.cell_diag/$scope.bloch['Nmax']));
    }
    $scope.bloch_solve_reset();
  }
  $scope.update_omega=function (e) {
    if (event.key=='Enter') {
      $http.post('update_omega',JSON.stringify({'omega':$scope.info.omega}))
      .then(function(response){
        $rootScope.$emit('load_fig1',response.data)
        // $scope.fig1 = response.data;
      })
    }
  }


  //////////////////////////////////////////////////////////////
  //// Graph stuffs
  //////////////////////////////////////////////////////////////
  $scope.show_u=function(){
    $scope.info.graph=$scope.info.graphs['u3d']
    $scope.info.modes['single']=false;
    $http.post('show_u',JSON.stringify({'rock':$scope.rock,'u':$scope.bloch['u']}))
      .then(function(response){
        $rootScope.$emit('load_fig2',response.data)
        // $scope.fig2 = response.data;
        // $log.log()
    });
  }

  $scope.show_scat=function(){
    $scope.info.graph=$scope.info.graphs['scat']
    $scope.info.modes['single']=false;
    $http.post('show_sf')
      .then(function(response){
        $rootScope.$emit('load_fig2',response.data)
        // $scope.fig2 = response.data;
        // $log.log()
    });
  }

  $scope.show_rock=function(){
    $scope.info.modes['single']=false;
    $scope.info.graph=$scope.info.graphs['rock']
    $http.post('show_rock',JSON.stringify({'refl':$scope.refl}))
      .then(function(response){
        $rootScope.$emit('load_fig2',response.data)
        // $scope.fig2 = response.data;
    });
  }

  $scope.beam_vs_thickness = function () {
    $scope.info.graph=$scope.info.graphs['thick']
    $http.post('beam_vs_thick',JSON.stringify({'thicks':$scope.bloch['thicks'],'refl':$scope.refl}))
      .then(function(response){
        $scope.info.modes['single']=false;
        $rootScope.$emit('load_fig2',response.data)
        // $scope.fig2 = response.data;
    });
  }

  $scope.update_graph=function(){
    // $log.log('update_graph',$scope.info.modes.single);
    if (!$scope.info.modes.single){
      switch ($scope.info.graph.type){
        case 'thick':
          $scope.beam_vs_thickness();
          break;
        case 'rock':
          $scope.show_rock();
          break;
        case '3d':
          $scope.show_u();
          break;
        case 'scat':
          $scope.show_scat();
          break;
        default :
          $scope.info.graph = $scope.info.graphs['thick'];
          $scope.beam_vs_thickness();
          break;
      }
    }
  }


  $rootScope.$on('update_graph',function(){
    // $log.log('update_graph')
    $scope.update_graph();
  })

  $scope.set_available_graphs = function(key,val){
    if(val){
      $scope.info.graphs[key]=JSON.parse(JSON.stringify(all_graphs[key]));
    }
    else{
      delete $scope.info.graphs[key];
    }
    // $log.log($scope.all_graphs);
  }

  ////////////////////////////////////////////////////////
  //// reflections stuffs
  ////////////////////////////////////////////////////////
  $scope.set_auto = function(){
    $scope.auto_refresh_style='';
    $scope.auto_refresh=!$scope.auto_refresh;
    if ($scope.auto_refresh){
      $scope.auto_refresh_style={"border-style":'solid'};
    }
  }
  $scope.add_refl=function(){
    clearTable();
    for (let i=0;i<$scope.refl.length;i++){
      addRow_tagTable($scope.refl[i]);
    }
  }
  $scope.clear_table=function(){
    clearTable();
    $scope.update_refl();
  }
  $scope.update_refl = function(){
    $scope.refl = extract_list_indices_from_table()
    $http.post('update_refl',JSON.stringify({'refl':$scope.refl}))
      .then(function(response){
        // $log.log(response.data);
    });
    if ($scope.auto_refresh){
      $scope.update_graph()
    }
  }

  $rootScope.$on('addRow_tagTable',function(event,data){
      $scope.addRow_tagTable(data);
    })

  $scope.addRow_tagTable=function(h){
    // let h=data.points[0].customdata[1];
    addRow_tagTable(h);
    $scope.update_refl();
    // $log.log($scope.expand)
    $scope.expand['refl']=true;
    // $log.log($scope.expand)
  }


  ////////////////////////////////////////////////////////////////////////////////////////////////
  // init stuffs
  ////////////////////////////////////////////////////////////////////////////////////////////////
  $scope.init = function(){
    // wait for the main ctrl init to be over
    $scope.init_done=false;
    let initInterval = setInterval(function(){
      $http.get('init_done')
      .then(function(response) {
        $scope.init_done=response.data;
        if ($scope.init_done){
          clearInterval(initInterval);
          $log.log('main init complete')
          $scope.init_bloch_panel();
          }
          else{
            $log.log('waiting for main init to complete')
          }
        })
      },200);
    }

  $scope.init_bloch_panel = function(){
    $log.log('Starting init bloch panel');
    $http.get('init_bloch_panel')
      .then(function(response){
        $scope.theta_phi    = response.data.theta_phi.split(',');
        $scope.bloch        = response.data.bloch;
        $scope.rock         = response.data.rock;
        $scope.exp_rock     = response.data.exp_rock;
        $scope.rock_state   = response.data.rock_state;
        $scope.expand       = response.data.expand;
        $scope.refl         = response.data.refl;
        $scope.info.modes   = response.data.bloch_modes;
        $scope.info.omega   = response.data.omega;
        $scope.info.max_res = response.data.max_res;
        $scope.info.dq_ring = response.data.dq_ring;
        $scope.info.rings   = response.data.rings;
        $scope.info.cell_diag = response.data.cell_diag;
        $scope.u_style[$scope.info.modes['u']]={"border-style":'solid'};
        $scope.info.graph = $scope.info.graphs[response.data.graph]

        $scope.set_available_graphs('rock',$scope.rock_state=='done' || $scope.exp_rock);
        $scope.bloch_solve_reset();
        $log.log('bloch init done');
        $scope.update_bloch();
      });
  }

  $scope.info=bloch_shared;
  var changed=true;
  $scope.frame  = 1;
  $scope.nbeams = 0;
  $scope.nrock_beams=0;
  $scope.show_buttons=false;
  $scope.dtheta_phi=0.1;
  $scope.dthick=5;
  // $scope.refl=[];
  $scope.rock_style = '';
  $scope.solve_rock_btn='Solve rock';
  $scope.popup={}
  $scope.sim_rock = 1;
  $scope.rock_sim = 1;
  $scope.u_style = {'edit':'','move':'','rock':''};

  // $scope.rock_done = false;
  $scope.input={'theta':false,'phi':false,'dtp':false ,'rock_sim':true};
  // $scope.structures = [];
  // var mode_style = {"border-style":'solid','background-color':'#18327c'};
  var bloch_colors={'Solve':'#337ab7','Solving':'red','Completed':'green'}
  var all_graphs={
    thick:{type:'thick',desc:'thickness'},
    u3d:{type:'3d',desc:'3d view'},
    rock:{type:'rock',desc:'rocking curve'},
    scat:{type:'scat',desc:'scattering factors'}}
  $scope.info.graphs = JSON.parse(JSON.stringify(all_graphs))
  $scope.show={}
  $scope.auto_refresh=true;
  $scope.auto_refresh_style='';
  $scope.init();

}]);


}());
