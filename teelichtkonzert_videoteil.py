# !/usr/bin/env python3
# -*- coding: utf-8 -*-

'''
+-----------------+------------------------------------------------------------------------------------------+
| Title:          | Teelichtkonzert                                                                          |
+-----------------+------------------------------------------------------------------------------------------+
| Description:    | Der Programmcode ermittelt mithilfe der Python-Bibliothek "OpenCV" die visuellen        |
|                 | Effekt- und Klangeinstellungen für eine anschließende Audiomischung.                     |
+-----------------+------------------------------------------------------------------------------------------+
| Author:         | Serge Gräfenstein                                                                        |
+-----------------+------------------------------------------------------------------------------------------+
| Created Date:   | 03. December 2022                                                                        |
+-----------------+------------------------------------------------------------------------------------------+
| Python Version: | 3.9.13                                                                                   |
+-----------------+------------------------------------------------------------------------------------------+

Geändert:
Value der Lautstärke auf 127 skaliert, anstatt 1,2,3,4
    32, 64, 96, 127 
'''

import cv2
import numpy as np
from sys import exit
import mido
import rtmidi

def send_midi_message(message):

    midi_output_name = mido.get_output_names()
    midi_output = mido.open_output(midi_output_name[1])

    midi_output.send(message)

def get_frame(video_capture):
    
    ret, frame = video_capture.read()

    #frame = cv2.resize(frame, None, fx = 0.4, fy = 0.4, interpolation = cv2.INTER_AREA)
    
    return frame

def calculate_coordinates(frame):
    
    lower_detection_border = np.array([15, 0, 170], dtype = 'uint8')
    upper_detection_border = np.array([30, 255, 255], dtype = 'uint8')

    kernel = np.ones((2, 2), dtype = 'uint8')

    blurred_frame = cv2.GaussianBlur(frame, (7, 7), 0)

    frame_hsv_colorspace = cv2.cvtColor(blurred_frame, cv2.COLOR_BGR2HSV)
   
    masking_frame = cv2.inRange(frame_hsv_colorspace, lower_detection_border, upper_detection_border)
    
    ret, thresholding_frame = cv2.threshold(masking_frame, 0, 255, 0) 
           
    thresholding_frame = cv2.morphologyEx(thresholding_frame, cv2.MORPH_CLOSE, kernel)    

    thresholding_frame = cv2.dilate(thresholding_frame, kernel, iterations = 5)

    contours = cv2.findContours(thresholding_frame, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[-2]

    if len(contours) != 4:

        for i in contours:
            area = cv2.contourArea(i)
            
            if area < 4000:
                cv2.fillPoly(thresholding_frame, pts = [i], color = [0])
                continue

        contours = cv2.findContours(thresholding_frame, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[-2]
    
    if len(contours) != 4:
        print('\nKalibrieren sie die Webcam neu!')
        exit()

    coordinates = []
    for i in contours:
        x, y, w, h = cv2.boundingRect(i)
        coordinates.append([x, y, w, h])

    coordinates.sort(key = lambda x:x[0], reverse = False) 

    return coordinates

def crop_frame(coordinates, frame):

    shape_frame = frame.shape
    cropped_frame = []

    for i in range(0, len(coordinates)):
        crop_frame = frame[0:shape_frame[0], coordinates[i][0] - 15:(coordinates[i][0] + coordinates[i][2] + 15)]
        cropped_frame.append(crop_frame) 

    return cropped_frame

def fire_detection(cropped_frame):

    lower_detection_border = np.array([0, 0, 255], dtype = 'uint8')
    upper_detection_border = np.array([0, 0, 255], dtype = 'uint8')
    
    frame_hsv_colorspace = cv2.cvtColor(cropped_frame, cv2.COLOR_BGR2HSV)
     
    masking_frame = cv2.inRange(frame_hsv_colorspace, lower_detection_border, upper_detection_border)
    
    #output_fire = cv2.bitwise_and(cropped_frame, frame_hsv_colorspace, mask = masking_frame)

    check_fire_detected = cv2.countNonZero(masking_frame)
    
    return check_fire_detected

def effect_detection(cropped_frame):

    blurred_frame = cv2.GaussianBlur(cropped_frame, (7, 7), 0)

    frame_hsv_colorspace = cv2.cvtColor(blurred_frame, cv2.COLOR_BGR2HSV)

    effect_color = np.array([[[20, 200, 150], [25, 255, 255]], [[30, 100, 100], [70, 255, 255]], [[90, 80, 80], [100, 255, 255]], [[110, 80, 80], [120, 255, 255]]], dtype = 'uint8')

    effect_label = ['gelb', 'gruen', 'hellblau', 'dunkelblau']

    effect_index = []

    for i in range(0, len(effect_color)):
        
        masking_frame = cv2.inRange(frame_hsv_colorspace, effect_color[i][0], effect_color[i][1])
        
        effect_detection = cv2.countNonZero(masking_frame)

        if int(effect_detection) > 0:
            effect_index = effect_label[i]
            break

    return effect_index

def calculate_center(cropped_frame):
    
    lower_detection_border = np.array([15, 0, 170], dtype = 'uint8')
    upper_detection_border = np.array([30, 255, 255], dtype = 'uint8')

    kernel = np.ones((2, 2), dtype = 'uint8')

    blurred_frame = cv2.GaussianBlur(cropped_frame, (7, 7), 0)

    frame_hsv_colorspace = cv2.cvtColor(blurred_frame, cv2.COLOR_BGR2HSV)
   
    masking_frame = cv2.inRange(frame_hsv_colorspace, lower_detection_border, upper_detection_border)
    
    ret, thresholding_frame = cv2.threshold(masking_frame, 0, 255, 0)
           
    thresholding_frame = cv2.morphologyEx(thresholding_frame, cv2.MORPH_CLOSE, kernel)    

    thresholding_frame = cv2.dilate(thresholding_frame, kernel, iterations = 5)

    contours = cv2.findContours(thresholding_frame, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[-2]
    
    center = []

    for i in contours:
        M = cv2.moments(i)
        if M['m00'] != 0:
            
            x = int(M['m10'] / M['m00'])
            y = int(M['m01'] / M['m00'])
            
            center.append([x, y])
        
    center.sort(key = lambda x: x[0], reverse = False)

    return center

if __name__=='__main__':

    video_capture = cv2.VideoCapture(0)

    coordinates = calculate_coordinates(get_frame(video_capture))
   
    while (video_capture.isOpened()):
        cropped_frame = crop_frame(coordinates, get_frame(video_capture))    



        if int(fire_detection(cropped_frame[0])) == 0: 
            print('[1] Kein Feuer erkannt!')
            send_midi_message(mido.Message('control_change', control = 1, value = 0))   

        else:
            print('[1] Feuer erkannt!')
            send_midi_message(mido.Message('note_on', note = 36))
        
            if effect_detection(cropped_frame[0]) == 'gelb':
                print('[1] Effekt erkannt!')
                send_midi_message(mido.Message('note_on', note = 5))
           
            else:
                send_midi_message(mido.Message('note_off', note = 5))

            if 400 < calculate_center(cropped_frame[0])[0][1] < 520:
                print('[1] Lautstärke 1')
                send_midi_message(mido.Message('control_change', control = 1, value = 32))

            elif 520 < calculate_center(cropped_frame[0])[0][1] < 560:
                print('[1] Lautstärke 2')
                send_midi_message(mido.Message('control_change', control = 1, value = 64))

            elif 560 < calculate_center(cropped_frame[0])[0][1] < 600:
                print('[1] Lautstärke 3')
                send_midi_message(mido.Message('control_change', control = 1, value = 96))

            elif 600 < calculate_center(cropped_frame[0])[0][1] < 640:
                print('[1] Lautstärke 4')
                send_midi_message(mido.Message('control_change', control = 1, value = 127))


      
        if int(fire_detection(cropped_frame[1])) == 0: 
            print('[2] Kein Feuer erkannt!')
            send_midi_message(mido.Message('control_change', control = 2, value = 0))  
        
        else:
            print('[2] Feuer erkannt!')
            send_midi_message(mido.Message('note_on', note = 36))

            if effect_detection(cropped_frame[1]) == 'gruen':
                print('[2] Effekt erkannt!')    
                send_midi_message(mido.Message('note_on', note = 6))

            else:
                send_midi_message(mido.Message('note_off', note = 6))

            if 480 < calculate_center(cropped_frame[1])[0][1] < 520:
                print('[2] Lautstärke 1')
                send_midi_message(mido.Message('control_change', control = 2, value = 32))

            elif 520 < calculate_center(cropped_frame[1])[0][1] < 560:
                print('[2] Lautstärke 2')
                send_midi_message(mido.Message('control_change', control = 2, value = 64))

            elif 560 < calculate_center(cropped_frame[1])[0][1] < 600:
                print('[2] Lautstärke 3')
                send_midi_message(mido.Message('control_change', control = 2, value = 96))

            elif 600 < calculate_center(cropped_frame[1])[0][1] < 640:
                print('[2] Lautstärke 4')
                send_midi_message(mido.Message('control_change', control = 2, value = 127))


     
        if int(fire_detection(cropped_frame[2])) == 0: 
            print('[3] Kein Feuer erkannt!')
            send_midi_message(mido.Message('control_change', control = 3, value = 0)) 

        else:
            print('[3] Feuer erkannt!')
            send_midi_message(mido.Message('note_on', note = 36))    

            if effect_detection(cropped_frame[2]) == 'hellblau':
                print('[3] Effekt erkannt!')
                send_midi_message(message = mido.Message('note_on', note = 7))

            else:
                send_midi_message(message = mido.Message('note_off', note = 7))

            if 480 < calculate_center(cropped_frame[2])[0][1] < 520:
                print('[3] Lautstärke 1')
                send_midi_message(mido.Message('control_change', control = 3, value = 32))

            elif 520 < calculate_center(cropped_frame[2])[0][1] < 560:
                print('[3] Lautstärke 2')
                send_midi_message(mido.Message('control_change', control = 3, value = 64))

            elif 560 < calculate_center(cropped_frame[2])[0][1] < 600:
                print('[3] Lautstärke 3')
                send_midi_message(mido.Message('control_change', control = 3, value = 96))

            elif 600 < calculate_center(cropped_frame[2])[0][1] < 640:
                print('[3] Lautstärke 4')
                send_midi_message(mido.Message('control_change', control = 3, value = 127))


      
        if int(fire_detection(cropped_frame[3])) == 0: 
            print('[4] Kein Feuer erkannt!')
            send_midi_message(mido.Message('control_change', control = 4, value = 0)) 

        else:
            print('[4] Feuer erkannt!')
            send_midi_message(mido.Message('note_on', note = 36))

            if effect_detection(cropped_frame[3]) == 'dunkelblau':
                print('[4] Effekt erkannt!')
                send_midi_message(mido.Message('note_on', note = 8))

            else:
                send_midi_message(message = mido.Message('note_off', note = 8))

            if 480 < calculate_center(cropped_frame[3])[0][1] < 520:
                print('[4] Lautstärke 1')
                send_midi_message(mido.Message('control_change', control = 4, value = 32))

            elif 520 < calculate_center(cropped_frame[3])[0][1] < 560:
                print('[4] Lautstärke 2')
                send_midi_message(mido.Message('control_change', control = 4, value = 64))

            elif 560 < calculate_center(cropped_frame[3])[0][1] < 600:
                print('[4] Lautstärke 3')
                send_midi_message(mido.Message('control_change', control = 4, value = 96))

            elif 600 < calculate_center(cropped_frame[3])[0][1] < 640:
                print('[4] Lautstärke 4')
                send_midi_message(mido.Message('control_change', control = 4, value = 127))
    
        output_frame = get_frame(video_capture)
        shape_frame = output_frame.shape

        for i in range(0, len(cropped_frame)):
            
            cv2.rectangle(output_frame, (coordinates[i][0] - 15, 0), (coordinates[i][0] + 15 + coordinates[i][2], shape_frame[0]), (255, 255, 255), 1)
            cv2.putText(output_frame, str(i +1), (coordinates[i][0] + 13, 20), 1, cv2.FONT_HERSHEY_PLAIN, (255, 255, 255), 1)
        
        cv2.imshow('Output', output_frame)
       
        if cv2.waitKey(10) == 27:
            break
            
video_capture.release()
cv2.destroyAllWindows()