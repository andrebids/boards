/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import * as THREE from 'three';
/* eslint-disable import/extensions, import/no-unresolved */
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
/* eslint-enable import/extensions, import/no-unresolved */

import styles from './CardImageCarousel.module.scss';

const disposeMaterial = (material) => {
  Object.values(material).forEach((value) => {
    if (value?.isTexture) {
      value.dispose();
    }
  });

  material.dispose();
};

const disposeObject = (object) => {
  object.traverse((child) => {
    child.geometry?.dispose();

    if (Array.isArray(child.material)) {
      child.material.forEach(disposeMaterial);
    } else if (child.material) {
      disposeMaterial(child.material);
    }
  });
};

const loadModel = async (url, format) => {
  switch (format) {
    case 'obj':
      return new OBJLoader().loadAsync(url);
    case 'stl': {
      const geometry = await new STLLoader().loadAsync(url);

      geometry.computeVertexNormals();

      return new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: 0xd4d4d8,
          metalness: 0.08,
          roughness: 0.72,
        }),
      );
    }
    case 'glb':
    case 'gltf':
      return (await new GLTFLoader().loadAsync(url)).scene;
    default:
      throw new Error('Unsupported 3D format');
  }
};

const ThreeDViewer = React.memo(({ attachment, format }) => {
  const [t] = useTranslation();
  const [status, setStatus] = useState('loading');
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    let disposed = false;
    let model;
    let renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
    } catch {
      setStatus('error');
      return undefined;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-label', attachment.name);
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.tabIndex = 0;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 2.4));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.8);

    directionalLight.position.set(3, 5, 4);
    scene.add(directionalLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.screenSpacePanning = true;
    controls.listenToKeyEvents(renderer.domElement);

    const render = () => {
      renderer.render(scene, camera);
    };

    const resize = () => {
      const { clientHeight, clientWidth } = container;

      if (!clientHeight || !clientWidth) {
        return;
      }

      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      render();
    };

    const resizeObserver = new ResizeObserver(resize);

    resizeObserver.observe(container);
    controls.addEventListener('change', render);

    loadModel(attachment.data.url, format)
      .then((loadedModel) => {
        if (disposed) {
          disposeObject(loadedModel);
          return;
        }

        model = loadedModel;

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);

        if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
          throw new Error('Empty 3D model');
        }

        model.position.sub(center);
        scene.add(model);

        const distance = maxDimension / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

        camera.near = Math.max(distance / 100, 0.001);
        camera.far = distance * 100;
        camera.position.set(distance * 0.75, distance * 0.5, distance * 1.35);
        camera.updateProjectionMatrix();

        controls.target.set(0, 0, 0);
        controls.minDistance = distance * 0.05;
        controls.maxDistance = distance * 10;
        controls.update();
        controls.saveState();

        setStatus('ready');
        resize();
      })
      .catch(() => {
        if (!disposed) {
          setStatus('error');
        }
      });

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      controls.removeEventListener('change', render);
      controls.stopListenToKeyEvents();
      controls.dispose();

      if (model) {
        scene.remove(model);
        disposeObject(model);
      }

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [attachment.data.url, attachment.name, format]);

  return (
    <div
      className={styles.threeDPreview}
      aria-busy={status === 'loading'}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onPointerCancel={(event) => event.stopPropagation()}
    >
      <div ref={containerRef} className={styles.threeDCanvas} />
      {status === 'loading' && (
        <span className={classNames(styles.previewMessage, styles.threeDStatus)} role="status">
          <span className={styles.mediaLoadingSpinner} aria-hidden="true" />
          {t('common.loading')}
        </span>
      )}
      {status === 'error' && (
        <span className={classNames(styles.previewMessage, styles.threeDStatus)} role="alert">
          <Icon fitted name="cube" size="big" aria-hidden="true" />
          <span className={styles.previewName} title={attachment.name}>
            {attachment.name}
          </span>
          {t('common.thereIsNoPreviewAvailableForThisAttachment')}
        </span>
      )}
    </div>
  );
});

ThreeDViewer.propTypes = {
  attachment: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  format: PropTypes.oneOf(['obj', 'stl', 'glb', 'gltf']).isRequired,
};

export default ThreeDViewer;
